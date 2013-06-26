Interface = function(options) {
	options = options || {};
  this._id = options._id;
	this.name = options.name || "udp_";
	this.transport = options.transport || {type: "udp"};
  //transport default values
	switch(this.transport.type) {
		case "tcp":
			this.transport.remote_ip = this.transport.remote_ip || "127.0.0.1";
			this.transport.local_ip = this.transport.local_ip || "0.0.0.0";
			this.transport.local_port = this.transport.local_port || 22000;
			this.transport.remote_port = this.transport.remote_port || 22000;
			this.transport.mode = this.transport.mode || "server";
			break;
		case "udp":
      this.transport.remote_ip = this.transport.remote_ip || "127.0.0.1";
      this.transport.local_ip = this.transport.local_ip || "0.0.0.0";
      this.transport.local_port = this.transport.local_port || 22000;
      this.transport.remote_port = this.transport.remote_port || 22000;
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