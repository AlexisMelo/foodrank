import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SearchSheetStore } from '@/core/search/search-sheet-store';

/**
 * Navigation bar fixed at the bottom of the private pages: Home, Explore, the Search button (magnifying glass) opening
 * the search sheet, Community and Tierlists.
 */
@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-bottom-tab-bar',
  styleUrl: './bottom-tab-bar.scss',
  templateUrl: './bottom-tab-bar.html',
})
export class BottomTabBar {
  /**
   * Opens the search sheet (SearchSheet) from the Search button
   */
  protected readonly searchSheet = inject(SearchSheetStore);

  /**
   * A tab is active on its exact path only, whatever the query (e.g. not on /tierlists/42)
   */
  protected readonly exactPath = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  } as const;
}
