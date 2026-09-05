export { useRecipes } from './useRecipes';
export { useSettings, useSetting } from './useSettings';

// Primary cooking hook — consumers should use this
export { useCookingMachine } from './useCookingMachine';
export type { UseCookingMachineResult } from './useCookingMachine';

// Shared types and factory
export type { Services, CookingState, CookingSend } from './cooking-machine-shared';
export { createServices } from './cooking-machine-shared';
