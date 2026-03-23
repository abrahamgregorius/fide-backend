function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function unauthorized(res, message = "Unauthorized") {
  return res.status(401).json({ success: false, message });
}

function notFound(res, message = "Not found") {
  return res.status(404).json({ success: false, message });
}

function serverError(res, message = "Internal server error") {
  return res.status(500).json({ success: false, message });
}

module.exports = {
  ok,
  badRequest,
  unauthorized,
  notFound,
  serverError,
};
