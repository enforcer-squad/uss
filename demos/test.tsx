import { getReactiveData, useMutation, useQuery } from '@/export';
import axios from 'axios';
import { setAutoFreeze } from 'immer';
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
const logout = () =>
  client({
    url: `/v1/user-logout`,
    method: 'post',
  });
const useLogout = () =>
  useMutation(logout, {
    params: [],
    onSuccess() {
      window.location.href = `https://portal.infervision.com/login?rd=front-paramdoc.k8s.infervision.com/`;
    },
  });
const Test = ({ init }: any) => {
  const { mutate } = useLogout();
  mutate();
  // useEffect(() => {
  //   if (initData) {
  //     console.log('初始化');
  //     setData(initData);
  //     // console.log(initData.modules);
  //   }
  // }, [initData]);

  return <div>test</div>;
};
const Test1 = () => {
  const data = getReactiveData(['unit', 1, 1], {});
  console.log('test1', data);

  return <div>test1</div>;
};

export { Test, Test1 };
