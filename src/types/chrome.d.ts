// Type definitions for Chrome extension API
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | object | null,
        callback: (items: { [key: string]: any }) => void
      ): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }

    interface StorageChange {
      /** Optional. The new value of the item, if there is a new value. */
      newValue?: any;
      /** Optional. The old value of the item, if there was an old value. */
      oldValue?: any;
    }

    interface SyncStorageArea {
      get(keys: string[], callback: (result: { [key: string]: any }) => void): void;
      set(items: { [key: string]: any }): void;
    }

    const sync: SyncStorageArea;
    const local: StorageArea;
    const managed: StorageArea;

    function onChanged(
      callback: (changes: { [key: string]: StorageChange }, areaName: string) => void
    ): void;
  }
}
