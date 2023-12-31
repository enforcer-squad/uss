/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC } from 'react';
import { memo, useState } from 'react';
import { uss, useUSS, devtools, useQuery, subscribe, invalidateData, useMutation } from '@/export';

const model = uss({
  key: 'app',
  person: { name: 'xxx', age: 0 },
  list: [
    { key: 'list1', value: 'list1' },
    { key: 'list2', value: 'list2' },
  ],
  changeName(x: string) {
    this.person.name = x;
  },
  addAge(x: number) {
    model.person.age = x;
  },
  test(index: number) {
    model.list[index - 1].value = 'list11';
  },
  push() {
    model.list.push({ key: 'list3', value: 'list3' });
  },
  unshift() {
    model.list.unshift({ key: 'list0', value: 'list0' });
  },
  remove() {
    model.list.pop();
  },
  shift() {
    model.list.shift();
  },
});
devtools(model, { name: 'app' });

const sleep = async (t: number) => await new Promise(res => setTimeout(res, t));

const service = async (id: number) => {
  console.log('方法被执行');
  await sleep(2000);
  return id;
};
// const useTestRequest = (id: number) => useQuery(['test'], service, { manual: id === undefined, placeholderData: 0 });
const useTestRequest = (id: number) =>
  useQuery(['test'], service, {
    params: [id],
    placeholderData: 0,
    onSuccess: () => {
      console.log('sssss');
    },
  });

const useTestRequest1 = (id: number) =>
  useMutation(service, {
    params: [id],
    placeholderData: 0,
    onSuccess: () => {
      console.log('sssss');
    },
  });

subscribe(model.person, (path, v, ov) => {
  console.log('改变了', path, v, ov);
});
interface PropTypes {
  p: number | undefined;
}
const ComRequest1: FC<PropTypes> = memo(({ p }) => {
  const { loading, cancel, data, error, refetch } = useTestRequest(p!);
  const { data: data1, mutate } = useTestRequest1(1);
  console.log('ComRequest1 render', loading, cancel, data);
  return (
    <>
      <span>{data}</span>
      <span>{data1}</span>
      <button
        onClick={() => {
          mutate(10);
        }}>
        手动10
      </button>
      <button
        onClick={() => {
          refetch(20);
        }}>
        手动20
      </button>
    </>
  );
});
const ComRequest2: FC<PropTypes> = memo(({ p }) => {
  const { loading, cancel, data, error, refetch } = useTestRequest(p!);
  console.log('ComRequest2 render');

  return (
    <>
      <span>{data}</span>
      <button
        onClick={() => {
          refetch(10);
        }}>
        手动10
      </button>
      <button
        onClick={() => {
          refetch(20);
        }}>
        手动20
      </button>
    </>
  );
});

const App = () => {
  console.log('parent render');
  const { list, test, push, remove, shift, unshift } = useUSS(model);

  return (
    <div>
      {list.map(item => {
        return <span key={item.key}>{item.value}</span>;
      })}
      <button
        onClick={() => {
          test(1);
        }}>
        change
      </button>
      <button
        onClick={() => {
          unshift();
        }}>
        unshift
      </button>
      <button
        onClick={() => {
          push();
        }}>
        push
      </button>
      <button
        onClick={() => {
          remove();
        }}>
        remove
      </button>
      <button
        onClick={() => {
          shift();
        }}>
        shift
      </button>
      {/* <button
        onClick={() => {
          setP(10);
        }}>
        模拟自动10
      </button>
      <button
        onClick={() => {
          setP(20);
        }}>
        模拟自动20
      </button>

      <button
        onClick={() => {
          invalidateData(['test', 10]);
        }}>
        缓存失效
      </button>
      <ComRequest1 p={p} />
      <ComRequest2 p={p} /> */}
    </div>
  );
};

export default App;
