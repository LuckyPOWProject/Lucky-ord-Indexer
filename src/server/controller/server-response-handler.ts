export const ServerResponseSuccess = (e: any) => {
  return { code: 200, data: e };
};

export const ErrorResponse = (e: string) => {
  return { code: 404, message: e };
};
