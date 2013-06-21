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
			count: 50,
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
			var count = value.count || 1;
			bytes += len * count;
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

				rcv_value = self.valueFromBuffer(msg, value);

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

				self.valueToBuffer(msg, value);
			}
			return msg;
		},

		valueFromBuffer: function(msg, value) {
			var self = this;
			if(value.type == "String") {
				rcv_value = self._strBufferValue(msg, value);
			} else {
				rcv_value = self._numBufferValue(msg, value, Buffer.prototype['read' + value.type]);
			}
			return rcv_value;
		},

		_strBufferValue: function(msg, value) {
			var bytes_left = msg.length - value.offset;
			var type_length = type_lengths[value.type];
			var value_length = value.count * type_length;

			var length = value_length >  bytes_left ? bytes_left : value_length;

			value.current = msg.toString(
				value.encoding,
				value.offset,
				value.offset + length);

			return value.current;
		},

		_numBufferValue: function(msg, value, callback) {
			var type_length = type_lengths[value.type];

			var new_val = "";
			for(var i = 0; i < value.count; i++) {
				var offset = +value.offset + (i * type_length);
				var bytes_left = msg.length - offset;
				if(bytes_left >= type_length) {
					new_val += callback.call(msg, offset);
					new_val += "#";
				}
			}
			new_val = new_val.substr(0, new_val.length - 1);

			return new_val;
		},

		valueToBuffer: function(msg, value) {
			var self = this;
			if(value.type == "String") {
				self._bufferStrValue(msg, value);
			} else {
				self._bufferNumValue(msg, value, Buffer.prototype['write' + value.type]);
			}
		},

		_bufferStrValue: function(msg, value) {
			var bytes_left = msg.length - value.offset;
			var type_length = type_lengths[value.type];
			var value_length = value.current.length * type_length;

			var length = value_length >  bytes_left ? bytes_left : value_length;

			msg.write(value.current,
				value.offset,
				value.offset + length,
				value.encoding);
		},

		_bufferNumValue: function(msg, value, callback) {
			var type_length = type_lengths[value.type];
			var current_split = value.current.split("#");

			var new_val = "";
			for(var i = 0; i < current_split.length; i++) {
				var offset = +value.offset + (i * type_length);
				var bytes_left = msg.length - offset;
				if(bytes_left >= type_length) {
					callback.call(msg, +current_split[i], offset);
				}
			}
		}
	});
}