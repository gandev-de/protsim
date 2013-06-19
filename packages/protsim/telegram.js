var type_lengths = {
	"String": 1,
	"UInt8": 1,
	"UInt16LE": 2,
	"UInt16BE": 2,
	"UInt32LE": 4,
	"UInt32BE": 4,
	"Int8": 1,
	"Int16LE": 2,
	"Int16BE": 2,
	"Int32LE": 4,
	"Int32BE": 4,
	"FloatLE": 2,
	"FloatBE": 2,
	"DoubleLE": 4,
	"DoubleBE": 4
};

Telegram = function(options) {
	options = options || {};
	this._id = options._id;
	this.name = options.name || "default-tel";
	this.type = options.type || ["send", "receive"];
	this.values = options.values || [{
			type: "String",
			offset: 0,
			count: 5,
			encoding: "utf-8",
			name: "str1",
			current: "n/a"
		}
	];
};

Telegram.fromJSONValue = function(value) {
	return new Telegram({
		_id: value._id,
		name: value.name,
		type: value.type,
		values: value.values
	});
};

Telegram._nextOffset= function(values) {
	var self = this;
	values = values || self.values;
	var offset = -1;
	var last_value;
	values.forEach(function(value) {
		if(value.offset > offset) {
			offset = +value.offset;
			last_value = value;
		}
	});

	if(last_value) {
		var count = last_value.count;
		var type_length = type_lengths[last_value.type];
		return offset + type_length * count;
	}
	return 0;
};

Telegram.recalculateOffset = function(values) {
	var new_values = [];
	for (var i = 0; i < values.length; i++) {
		values[i].offset = i === 0 ? 0 : Telegram._nextOffset(new_values);
		new_values.push(values[i]);
	}
	return values;
};

Telegram.prototype = {
	constructor: Telegram,

	byteCount: function() {
		var self = this;
		var bytes = 0;
		self.values.forEach(function(value) {
			var len = type_lengths[value.type];
			if ((!len || len === 0) && value.count)
				bytes += value.count; //add count specified with value
			else if (len > 0)
				bytes += len;
		});
		return bytes;
	},

	addValue: function(value_name) {
      var self = this;
      var value = _.find(self.values, function(value) {
        return value.name === value_name;
      });
      var type = value.type || "UInt8";
      var count = value.count || 1;
      var encoding = value.encoding;
      var offset = Telegram._nextOffset(self.values);
      var name = value.name ? value.name + "_" + offset : "default_val" + offset;
      var ident_val = value.ident_val || 0;
      self.values.push({
		type: type,
		offset: offset,
		count: +count,
		encoding: encoding,
		name: name,
		current: undefined,
		ident_val: +ident_val
      });
	},

	//EJSON

	typeName: function() {
		return "Telegram";
	},

	equals: function(other) {
		return this._id == other._id &&
			this.name == other.name &&
			this.type == other.type &&
			_.isEqual(this.values, other.values);
	},

	clone: function() {
		return new Telegram({
			_id: this._id,
			name: this.name,
			type: this.type,
			values: this.values
		});
	},

	toJSONValue: function() {
		return {
			_id: this._id,
			name: this.name,
			type: this.type,
			values: this.values
		};
	}
};

EJSON.addType("Telegram", Telegram.fromJSONValue);

if (Meteor.isServer) {
	_.extend(Telegram.prototype, {
		//msg - Buffer, telegrams - [Telegram]
		convertFromBuffer: function(msg) {
			var self = this;

			var rcv_value, values = [];
			for (var i = 0; i < self.values.length; i++) {
				var value = self.values[i];
				try {
					switch (value.type) {
						case "UInt8":
							rcv_value = msg.readUInt8(value.offset);
							break;
						case "UInt16LE":
							rcv_value = msg.readUInt16LE(value.offset);
							break;
						case "UInt16BE":
							rcv_value = msg.readUInt16BE(value.offset);
							break;
						case "UInt32LE":
							rcv_value = msg.readUInt32LE(value.offset);
							break;
						case "UInt32BE":
							rcv_value = msg.readUInt32BE(value.offset);
							break;
						case "Int8":
							rcv_value = msg.readInt8(value.offset);
							break;
						case "Int16LE":
							rcv_value = msg.readInt16LE(value.offset);
							break;
						case "Int16BE":
							rcv_value = msg.readInt16BE(value.offset);
							break;
						case "Int32LE":
							rcv_value = msg.readInt32LE(value.offset);
							break;
						case "Int32BE":
							rcv_value = msg.readInt32BE(value.offset);
							break;
						case "FloatLE":
							rcv_value = msg.readFloatLE(value.offset);
							break;
						case "FloatBE":
							rcv_value = msg.readFloatBE(value.offset);
							break;
						case "DoubleLE":
							rcv_value = msg.readDoubleLE(value.offset);
							break;
						case "DoubleBE":
							rcv_value = msg.readDoubleBE(value.offset);
							break;
						case "String":
							rcv_value = msg.toString(value.encoding,
								value.offset,
								value.offset + value.count);
							break;
					}
				} catch (e) {
					rcv_value = "n/a";
				}
				value.current = rcv_value;
				values.push(value);
			}
			return values;
		},

		convertToBuffer: function() {
			var self = this;

			var msg = new Buffer(self.byteCount());
			for (var i = 0; i < self.values.length; i++) {
				var value = self.values[i];
				try {
					switch (value.type) {
						case "UInt8":
							msg.writeUInt8(+value.current, value.offset);
							break;
						case "UInt16LE":
							msg.writeUInt16LE(+value.current, value.offset);
							break;
						case "UInt16BE":
							msg.writeUInt16BE(+value.current, value.offset);
							break;
						case "UInt32LE":
							msg.writeUInt32LE(+value.current, value.offset);
							break;
						case "UInt32BE":
							msg.writeUInt32BE(+value.current, value.offset);
							break;
						case "Int8":
							msg.writeInt8(+value.current, value.offset);
							break;
						case "Int16LE":
							msg.writeInt16LE(+value.current, value.offset);
							break;
						case "Int16BE":
							msg.writeInt16BE(+value.current, value.offset);
							break;
						case "Int32LE":
							msg.writeInt32LE(+value.current, value.offset);
							break;
						case "Int32BE":
							msg.writeInt32BE(+value.current, value.offset);
							break;
						case "FloatLE":
							msg.writeFloatLE(+value.current, value.offset);
							break;
						case "FloatBE":
							msg.writeFloatBE(+value.current, value.offset);
							break;
						case "DoubleLE":
							msg.writeDoubleLE(+value.current, value.offset);
							break;
						case "DoubleBE":
							msg.writeDoubleBE(+value.current, value.offset);
							break;
						case "String":
							msg.write(value.current,
								value.offset,
								value.offset + value.current.length,
								value.encoding);
							break;
					}
				} catch(e) {
					console.log(e);
				}
			}
			return msg;
		}
	});
}