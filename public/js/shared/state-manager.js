export const stateManager = {
  create(initialState = {}) {
    let state = { ...initialState };

    return {
      getState: () => ({ ...state }),
      setState: (patch) => {
        state = { ...state, ...patch };
        return { ...state };
      }
    };
  }
};
