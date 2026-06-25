# Day 14 — Migrate Car List: Supabase → NestJS API

## Goal

Replace all Supabase `from("cars").select()` calls with Axios `GET` requests to the NestJS backend so the car list is served entirely from the custom stack.

---

## Why This Matters

The app is mid-migration. Auth (Day 12–13) now talks to NestJS, but **every car screen still hits Supabase directly**. Until the car list is migrated, you can't shut off Supabase. This is the highest-impact migration task.

---

## What Needs to Change

### Backend — Enhance `GET /cars`

The current `CarsController.findAll()` is a bare `prisma.car.findMany()` with no query params, no pagination, no relations. The frontend needs:

- **Pagination**: `?page=0&limit=10`
- **Filters**: `status`, `brand`, `postal_code`, `car_type`, `seats`, `priceMin`, `priceMax`, `ownerId`
- **Search**: `?search=keyword` (matches brand, model, car_number)
- **Includes**: `carImages`, `reviews` (for rating calculation)
- **Price range**: endpoint to compute `min(pricePerDay)` and `max(pricePerDay)` for filter UI
- **Date availability**: endpoint that accepts `startDate`+`endDate` and excludes booked cars

**Recommended approach**: Add a `CarsController` query DTO and a `findAllPaginated` method in the service/repository.

### Frontend — Swap Data Sources

There are three main car-list surfaces to migrate:

| File | What it does | Supabase → Axios |
|------|-------------|------------------|
| `hooks/useSearchCar.ts` | Fetches available cars, builds filter options, price range, pagination | All `supabase.from("cars").select()` → `carService.getCars(params)` |
| `app/(protected)/(home)/search.tsx` | Explore/search page with filters, date range, search bar | `handleSearch()` Supabase query → Axios call |
| `app/(protected)/(tabs)/owner_cars.tsx` | Owner's car list with infinite query, brand filter, search | `supabase.from("cars").select(...).eq("owner_id")` → `carService.getOwnerCars(ownerId, params)` |
| `hooks/useWishlist.ts` | Wishlist CRUD | Supabase → API (backend already has `Wishlist` model in Prisma) |

---

## Migration Steps

### Step 1: Enhance Backend `GET /cars`

Add query parameters support. Create `dto/query-car.dto.ts`:

| Param | Type | Purpose |
|-------|------|---------|
| `page` | `number` (default 0) | Offset-based pagination |
| `limit` | `number` (default 10) | Page size |
| `status` | `string` | Filter by status (e.g. "Available") |
| `search` | `string` | ILIKE search on brand, model, car_number |
| `brand` | `string` | Exact brand filter |
| `postal_code` | `string` | Location/postal code filter |
| `car_type` | `string` | Car type filter |
| `seats` | `number` | Seats filter |
| `priceMin` / `priceMax` | `number` | Price range filter |
| `ownerId` | `number` | Get cars by owner |
| `startDate` / `endDate` | `string` (ISO) | Exclude cars booked in this range |
| `include` | `string` | Relations to include ("images,reviews") |

Update `CarsController`:

```typescript
@Get()
async findAll(@Query() query: QueryCarDto) {
  return this.carsService.findAllPaginated(query);
}
```

In `CarsService.findAllPaginated()`, build Prisma `where`, `include`, `skip`, `take`, and return `{ data, total, page, limit }`.

### Step 2: Add Price Range Endpoint

```typescript
@Get('price-range')
async getPriceRange() {
  return this.carsService.getPriceRange();
}
```

```typescript
// service
async getPriceRange() {
  const [min, max] = await Promise.all([
    this.carsRepository.findMinPrice(),
    this.carsRepository.findMaxPrice(),
  ]);
  return { min, max };
}
```

### Step 3: Update `frontend/lib/api.ts` to Support Query Params

The current `api.ts` is a raw `fetch` wrapper. Ensure it can pass query strings:

```typescript
// if not already supported, add
get<T>(path: string, token?: string, params?: Record<string, any>): Promise<T>
```

### Step 4: Update `carService` in `serviceAdapters.ts`

Expand the typed service:

```typescript
export const carService = {
  getCars: (params?: Record<string, any>) =>
    api.get<any>("cars", undefined, params),
  getCar: (id: string) =>
    api.get<any>(`cars/${id}`),
  getPriceRange: () =>
    api.get<{ min: number; max: number }>("cars/price-range"),
  createCar: (body: any, token?: string) =>
    api.post<any>("cars", body, token),
  updateCar: (id: string, body: any, token?: string) =>
    api.patch<any>(`cars/${id}`, body, token),
  deleteCar: (id: string, token?: string) =>
    api.delete<any>(`cars/${id}`, token),
};
```

### Step 5: Rewrite `useSearchCar.ts`

Replace every `supabase.from("cars")` call:

- `fetchCars` → calls `carService.getCars({ page, limit, status: "Available", ... })`
- `fetchFilterOptions` → calls `carService.getCars({ limit: 1000 })` and computes types/seats client-side (or add a dedicated `/cars/filters` endpoint)
- `fetchPriceRange` → calls `carService.getPriceRange()`
- `fetchTotalCars` → use `total` from paginated response
- Remove `formatCarRatings` if backend returns avg_rating (or compute it client-side)

### Step 6: Rewrite `search.tsx`'s `handleSearch()`

```typescript
const handleSearch = useCallback(async () => {
  setIsSearching(true);
  try {
    const params: Record<string, any> = {
      status: "Available",
      priceMin: priceRange[0],
      priceMax: priceRange[1],
    };
    if (selectedTownship) params.postal_code = selectedTownship.postalCode;
    if (pickupDate) params.startDate = pickupDate;
    if (returnDate) params.endDate = returnDate;

    const result = await carService.getCars(params);
    const formatted = formatCarRatings(result.data);
    setCars(formatted);
  } catch (err) {
    console.error(err);
  } finally {
    setIsSearching(false);
  }
}, [pickupDate, priceRange, returnDate, selectedTownship, setCars]);
```

### Step 7: Rewrite `owner_cars.tsx`

Replace Supabase infinite query:

```typescript
queryFn: async ({ pageParam = 0 }) => {
  const params = {
    page: pageParam,
    limit: CARS_PAGE_SIZE,
    ownerId: user.id,
    search: debouncedSearch || undefined,
  };
  const result = await carService.getCars(params);
  return {
    cars: result.data,
    count: result.total,
    nextPage: result.page + 1 < Math.ceil(result.total / result.limit)
      ? result.page + 1
      : undefined,
  };
},
```

Also migrate the brands query to a simple Axios call or reuse the car list data.

### Step 8: Clean Up Supabase Imports

After completing the migration, remove `import { supabase } from "@/lib/supabase"` from:
- `hooks/useSearchCar.ts`
- `app/(protected)/(home)/search.tsx`
- `app/(protected)/(tabs)/owner_cars.tsx`

---

## Testing Checklist

- [ ] Backend `GET /cars?page=0&limit=10` returns paginated results with `{ data, total, page, limit }`
- [ ] Price range endpoint returns correct min/max
- [ ] Search by brand, model, car_number works
- [ ] Filter by location (postal_code), car_type, seats, price range works
- [ ] Date availability filter excludes booked cars
- [ ] Owner car list shows only owner's cars
- [ ] Infinite scroll / load more works in search.tsx
- [ ] Pull-to-refresh refetches from NestJS
- [ ] Wishlist toggle still works (wishlist will be migrated separately)
- [ ] No Supabase calls remain in migrated files

---

## Key Mapping: Supabase → Prisma Schema Differences

| Supabase (snake_case) | Prisma (camelCase) | Notes |
|----------------------|-------------------|-------|
| `id` | `id` | same |
| `owner_id` | `ownerId` | must map |
| `price_per_day` | `pricePerDay` | must map |
| `car_type` | `car_type` | same |
| `car_number` | `car_number` | same |
| `postal_code` | `postal_code` | same |
| `is_available` | `isAvailable` | must map |
| `car_images` | `carImages` | relation name |
| `created_at` | `createdAt` | must map |

The `carService` or a mapper function should handle this conversion, or better — update the Prisma schema to match the frontend conventions (or update the frontend to use camelCase).

---

## Files Modified

| File | Action |
|------|--------|
| `backend/src/cars/dto/query-car.dto.ts` | **New** — query params DTO |
| `backend/src/cars/cars.controller.ts` | **Edit** — add query params, price-range endpoint |
| `backend/src/cars/cars.service.ts` | **Edit** — add `findAllPaginated`, `getPriceRange` |
| `backend/src/cars/cars.repository.ts` | **Edit** — add paginated query methods |
| `frontend/hooks/useSearchCar.ts` | **Edit** — swap Supabase → Axios |
| `frontend/app/(protected)/(home)/search.tsx` | **Edit** — swap handleSearch |
| `frontend/app/(protected)/(tabs)/owner_cars.tsx` | **Edit** — swap infinite query |
| `frontend/lib/serviceAdapters.ts` | **Edit** — expand carService |
| `frontend/lib/api.ts` | **Edit** — add query params support (if missing) |

---

## Result

After Day 14, the car list flows entirely through the NestJS backend:

```
React Native App
  └─ useSearchCar.ts / search.tsx / owner_cars.tsx
       └─ carService.getCars(params)
            └─ api.get("cars?page=0&limit=10&status=Available")
                 └─ NestJS CarsController.findAll(query)
                      └─ CarsService.findAllPaginated(query)
                           └─ CarsRepository → Prisma → PostgreSQL
```

No more `supabase.from("cars").select()` — the app is one step closer to shutting off Supabase entirely.
