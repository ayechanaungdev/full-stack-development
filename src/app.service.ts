import { Injectable } from '@nestjs/common';

@Injectable() // This makes the service "Injectable" into other classes
export class AppService {

    // This is a simple function that returns a string
    getHello(): string {
        return 'Hello from my manual strong backend!';
    }

    // Get the current time function
    getTime(): string {
        return new Date().toLocaleTimeString();
    }
}
