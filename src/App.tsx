import React, { Fragment, useReducer } from "react";
import "./App.css";

const snapAudio = new Audio("fingerSnap.mp3");

/* types */

interface Action<T = any> {
  type: T;
}

interface AddTabAction extends Action<"@@ADD_TAB"> {
  tab: chrome.tabs.Tab;
}

interface RemoveTabAction extends Action<"@@REMOVE_TAB"> {
  tab: chrome.tabs.Tab;
}

interface ResetAction extends Action<"@@RESET"> {}

type ActionTypes = AddTabAction | RemoveTabAction | ResetAction;

type State = {
  byId: { [id: number]: chrome.tabs.Tab };
  allIds: number[];
};

/* state */

const initialState: State = {
  byId: {},
  allIds: []
};

/* reducer */

const reducer = (state: State, action: ActionTypes): State => {
  switch (action.type) {
    case "@@ADD_TAB":
      const tabId = action.tab.id as number;
      return {
        ...state,
        byId: {
          ...state.byId,
          [tabId]: action.tab
        },
        allIds: state.allIds.concat(tabId)
      };
    case "@@REMOVE_TAB":
      const { [action.tab.id as number]: removed, ...byId } = state.byId;
      return {
        ...state,
        byId,
        allIds: state.allIds.filter(id => id != action.tab.id)
      };
    default:
      return state;
  }
};

/* actions */

const actions = {
  addTab: (tab: chrome.tabs.Tab): AddTabAction => ({
    type: "@@ADD_TAB",
    tab
  }),
  removeTab: (tab: chrome.tabs.Tab): RemoveTabAction => ({
    type: "@@REMOVE_TAB",
    tab
  })
};

/* selectors */

const selectors = {
  getTabIds: (state: State): number[] => state.allIds,
  getTab: (state: State, id: number): chrome.tabs.Tab => state.byId[id],
  getTabs: (state: State): chrome.tabs.Tab[] =>
    selectors.getTabIds(state).map(id => selectors.getTab(state, id))
};

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const removeHalfTheTabs = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();

    snapAudio.load();

    chrome.tabs.query({ currentWindow: true }, tabs => {
      const takeCount = Math.ceil(tabs.length / 2);
      const activeTab = tabs.find(tab => tab.active) as chrome.tabs.Tab;
      const takeTabs = tabs
        .filter(tab => tab.id !== activeTab.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, takeCount);

      const removeTabIds: number[] = [];

      takeTabs.forEach(tab => {
        dispatch(actions.addTab(tab));
        removeTabIds.push(tab.id as number);
      });

      snapAudio.play();

      chrome.tabs.remove(removeTabIds);
    });
  };

  const restoreTab = (tab: chrome.tabs.Tab) => (
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const remainingTabCount = selectors.getTabIds(state).length;

    chrome.tabs.create({
      url: tab.url,
      active: remainingTabCount === 1 // last tab restored wil take focus and close the menu
    });

    dispatch(actions.removeTab(tab));
  };

  const removedTabs = selectors.getTabs(state);
  const removedTabCount = removedTabs.length;
  const hasRemovedTabs = removedTabCount > 0;

  return (
    <div className="App">
      {!hasRemovedTabs && (
        <div className="text-center">
          <img
            src="snap_before.png"
            onClick={removeHalfTheTabs}
            title="Click to decimate"
            className="glow"
          />
        </div>
      )}
      {hasRemovedTabs && (
        <div>
          <div className="text-center">
            <img src="snap_sound.png" className="glow" />
          </div>
          <div className="well">
            <h1 className="text-center">
              {removedTabCount} {removedTabCount == 1 ? "tab" : "tabs"}{" "}
              decimated.
            </h1>
            <ol>
              {removedTabs.map(tab => (
                <li key={tab.id}>
                  {tab.title} (
                  <a href="#" onClick={restoreTab(tab)}>
                    restore
                  </a>
                  )
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
