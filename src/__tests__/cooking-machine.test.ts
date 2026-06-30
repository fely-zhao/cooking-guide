import { createActor } from 'xstate';
import { cookingMachine } from '../machines/cooking-machine';

describe('cookingMachine', () => {
  it('should start in IDLE state', () => {
    const actor = createActor(cookingMachine);
    expect(actor.getSnapshot().value).toBe('IDLE');
  });
});
