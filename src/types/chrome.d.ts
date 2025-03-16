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
      newValue?: any;
      oldValue?: any;
    }

    const sync: StorageArea;
    const local: StorageArea;
    const managed: StorageArea;

    function onChanged(
      callback: (changes: { [key: string]: StorageChange }, areaName: string) => void
    ): void;
  }
}
