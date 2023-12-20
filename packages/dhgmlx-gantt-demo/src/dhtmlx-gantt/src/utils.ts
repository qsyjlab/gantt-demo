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
