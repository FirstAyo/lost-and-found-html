import { qs } from '../shared/ui-helpers.js';

const resultsContainer = qs('[data-browse-results]');

if (resultsContainer) {
  console.debug(`browse page ready with ${resultsContainer.children.length} result cards`);
}
