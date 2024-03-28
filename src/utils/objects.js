export const isObject = (a) => {
    return (!!a) && (a.constructor === Object);
}

export function isEmptyObjectOrNull(obj) {
    return !obj || obj === null || (isObject(obj) && Object.keys(obj).length === 0);
}