Interface = function(options) {
	options = options || {};
  this._id = options._id;
	this.name = options.name || "udp-default";
	this.transport = {type: options.type || "udp"};
	switch(this.transport.type) {
		case "tcp":
			this.transport.remote_ip = options.remote_ip || "127.0.0.1";
			this.transport.local_ip = options.local_ip || "0.0.0.0";
			this.transport.local_port = options.local_port || 22000;
			this.transport.remote_port = options.remote_port || 22000;
			this.transport.mode = options.mode || "server";
			break;
		case "udp":
			this.transport.remote_ip = options.remote_ip || "127.0.0.1";
			this.transport.local_ip = options.local_ip || "0.0.0.0";
			this.transport.local_port = options.local_port || 22000;
			this.transport.remote_port = options.remote_port || 22000;
			break;
		default:
			//TODO
	}
};

Interface.fromJSONValue = function (value) {
  return new Interface({
    _id: value._id,
    name: value.name,
    transport: value.transport
  });
};

Interface.prototype = {
  constructor: Interface,

  typeName: function () {
    return "Interface";
  },

  equals: function (other) {
    return this._id == other._id &&
      this.name == other.name &&
      _.isEqual(this.transport, other.transport);
  },

  clone: function () {
    return new Interface({
      _id: this._id,
      name: this.name,
      transport: this.transport
    });
  },

  toJSONValue: function () {
    return {
      _id: this._id,
      name: this.name,
      transport: this.transport
    };
  }
};

EJSON.addType("Interface", Interface.fromJSONValue);