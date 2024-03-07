import { useQuery, useReactive } from '@/export';
import axios from 'axios';
import { setAutoFreeze } from 'immer';
import { useEffect } from 'react';
setAutoFreeze(false);
type ModuleData = {
  title: Record<number, any>;
  table: Array<Record<number, any>>;
  enable: Record<number, any>;
};
type Module = {
  id?: string;
  type: 1 | 2;
  order: number;
  externalId?: string;
  data: ModuleData;
  updated_time?: Date;
  unitId: number;
};
interface Unit {
  id: number;
  name: string;
  display_name: string;
  product_name: string;
  product_display_name: string;
  config_param_version: number;
  config_param_updated_time: string;
  bidding_param_version: number;
  bidding_param_updated_time: string;
  modules: Module[];
}

const getUnit = (id: number, type: number): Promise<Unit> =>
  axios({
    url: `/pd-api/v1/unit/${id}?type=${type}`,
    method: 'get',
  }).then(res => res.data.data);

const useUnit = (id?: number, type?: number) =>
  useQuery(['unit'], getUnit, {
    params: [id, type],
  });

const Test = () => {
  const [data, setData] = useReactive<Unit>({} as any);
  const { data: initData } = useUnit(1, 1);

  console.log('data', data);
  window.setData = setData;
  useEffect(() => {
    if (initData) {
      setData(initData);

      console.log(initData.modules);
    }
  }, [initData]);

  return <div>111</div>;
};

export default Test;
