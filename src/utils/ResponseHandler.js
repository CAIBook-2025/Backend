class ResponseHandler {
  async success(status = 200, data = {}) {
    return {
      status,
      body: data
    };
  }
        
}

module.exports = new ResponseHandler();