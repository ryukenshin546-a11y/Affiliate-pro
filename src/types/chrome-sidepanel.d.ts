export {};

declare global {
  namespace chrome {
    namespace sidePanel {
      interface PanelBehavior {
        openPanelOnActionClick?: boolean;
      }

      interface SetOptionsOptions {
        tabId?: number;
        path?: string;
        enabled?: boolean;
      }

      interface OpenOptions {
        tabId: number;
      }

      function setPanelBehavior(behavior: PanelBehavior): Promise<void>;
      function setOptions(options: SetOptionsOptions): Promise<void>;
      function open(options: OpenOptions): Promise<void>;
    }

    const sidePanel: typeof chrome.sidePanel;
  }
}
