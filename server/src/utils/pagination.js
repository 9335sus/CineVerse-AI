exports.parsePagination = (q, defLimit = 20, max = 50) => {
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit) || defLimit, 1), max);
  return { page, limit, skip: (page - 1) * limit };
};
