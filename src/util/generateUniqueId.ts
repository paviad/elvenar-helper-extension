let cnt = 0;

export const generateUniqueId = (): number => Number(`${new Date().getTime()}${cnt++}`);
