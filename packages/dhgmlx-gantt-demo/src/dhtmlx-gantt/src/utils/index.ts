
import { ElMessage } from 'element-plus'

export function arrFormatToTree(list) {
    const tempTree = {};
  
    list.forEach((item) => {
      const { id, parent } = item;
  
      if (!tempTree[id]) {
        tempTree[id] = { ...item, children: [] };
      } else {
        tempTree[id] = { ...tempTree[id], ...item };
      }
  
      if (!tempTree[parent]) {
        tempTree[parent] = { children: [] };
      }
    });
  
    const tree: any[] = [];
    for (const id in tempTree) {
      const item = tempTree[id];
      const parentId = item.parent;
      if (tempTree[parentId]) {
        tempTree[parentId].children.push(item);
      } else {
        tree.push(item);
      }
    }
  
    return tree;
  }
  
  /**
   * 将 树型数据 转换为 下拉框选择数据
   * @param {*} options
   * @param {*} list
   * @param {*} id
   * @param {*} field
   */
  export function treeFormatToOptions(options, list, id, field) {
    list.forEach((item) => {
      if (String(item.id) === String(id)) return;
      const temp = {
        value: item.id ? String(item.id) : 0, // 将 id 转 string 是因为业务需求，在甘特图这里，后端保存的是 字符串，但是 甘特图组件自己生成的是 数字，这里不处理成 字符串，会导致找不到对应的下拉框选择数据
        label: item[field] || "无",
        showCode: item.showCode,
      };
  
      options.push(temp);
  
      if (item.children) {
        treeFormatToOptions(options, item.children, id, field);
      }
    });
  }
  
  // 将 下拉框数据根据 showCode 进行排序
  export function handleSortOptions(list) {
    list.sort((a, b) => {
      // 如果存在有数据没有 showCode 时候往前放
      if (!a.showCode) return -1;
      if (!b.showCode) return 1;
  
      // showCode 为 1\1.1\1.1.1 这样的，所以需要把他们通过 . 切割一下
      const aArray = String(a.showCode).split(".");
      const bArray = String(b.showCode).split(".");
  
      // 最后逐层比较
      for (let i = 0; i < Math.max(aArray.length, bArray.length); i += 1) {
        const aValue = parseInt(aArray[i], 10) || 0;
        const bValue = parseInt(bArray[i], 10) || 0;
        if (aValue !== bValue) {
          return aValue - bValue;
        }
      }
      return 0;
    });
  }
  
  
  // 延迟 子代的开始日期，duration 为与父级开始日期的 工作日天数差值
  export function delayChildStartDate(parentStart, duration) {
    // 设置一个 新变量，让其不污染 parentStart
    const tempDate = new Date(parentStart);
  
    // 循环遍历工作日
    for (let i = 0; i < duration; i += 1) {
      // 增加一天并跳过周末
      tempDate.setDate(tempDate.getDate() + 1);
  
      // 如果当前日期是周末，则跳过
      while (tempDate.getDay() === 0 || tempDate.getDay() === 6) {
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }
  
    return tempDate;
  }
  
  
  // 根据精度 确定需要增加的数值
  export function generateNumber(precision) {
    const num = 1 / 10 ** precision;
    return Number(num.toFixed(precision));
  }
  
  
  // 深拷贝
  export function deepClone(object) {
    return _baseDeepClone(object);
  }
  
  export function _baseDeepClone(obj, originalToCopyMap = new WeakMap()) {
    // 如果是基本数据类型，则直接返回
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }
  
    // 如果对象已经被复制过，直接返回复制后的对象，避免循环引用导致无限递归
    if (originalToCopyMap.has(obj)) {
      return originalToCopyMap.get(obj);
    }
  
    // 创建一个新的对象或数组
    const copy = Array.isArray(obj) ? [] : {};
  
    // 将原始对象和对应的复制对象存储在 Map 中
    originalToCopyMap.set(obj, copy);
  
    // 递归复制属性，同时忽略 _parent 属性
    for (const key in obj) {
      copy[key] = _baseDeepClone(obj[key], originalToCopyMap);
    }
  
    return copy;
  }
  
  
  
  // 判定是否是 vue 组件对象
  export function isComponent(target: any) {
    if (typeof target !== 'object') return false
  
    if (
      (target?.setup && isFunction(target.setup)) ||
      (target?.render && isFunction(target.render))
    ) {
      return true
    }
  
    return false
  }
  
  function isFunction(value){
    return typeof value === 'function'
  }
  

export function warning(message:string){
    console.warn(`[gantt:warn]: ${message}`)
    ElMessage.warning(message)
}  

export * from './date'
export * from './download'