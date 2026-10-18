import { Component, input } from '@angular/core';

/**
 * Block showing the postal address of a restaurant, after a pin.
 */
@Component({
  imports: [],
  selector: 'app-restaurant-address',
  styleUrl: './restaurant-address.scss',
  templateUrl: './restaurant-address.html',
})
export class RestaurantAddress {
  /**
   * Postal address of the restaurant
   */
  readonly address = input.required<string>();
}
