import { setData as _setData, getDataStore, getData, getReactiveData } from './store';
import { useQuery, setSnapshotData, setStaleData, getSnapshotData, invalidateData } from './useQuery';

export * from './useMutation';

const setData = (cacheKeys: (string | number)[], state: any) => {
  _setData(cacheKeys, state);
  const staleData = getSnapshotData(cacheKeys);
  setSnapshotData(cacheKeys, { ...staleData, data: state });
  setStaleData(cacheKeys, false);
};
export { setData, getDataStore, getData, getReactiveData, useQuery, invalidateData };
