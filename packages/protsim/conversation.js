Conversation = function(options) {
	options = options || {};
	this._id = options._id || Random.id();
	this.name = options.name || "default-conversation";
	this.sequence = options.sequence || [];
};

Conversation.ACTIVE = "ACTIVE";
Conversation.ENDED = "ENDED";
Conversation.CANCELED = "CANCELED";
Conversation.PAUSED = "PAUSED";

Conversation.fromJSONValue = function(value) {
  var sequence = [];
  _.each(value.sequence, function(telegram_obj_json) {
	var telegram_obj = telegram_obj_json;
	telegram_obj.telegram = Telegram.fromJSONValue(telegram_obj.telegram);
    sequence.push(telegram_obj);
  });

	return new Conversation({
		_id: value._id,
		name: value.name,
		sequence: sequence
	});
};

Conversation.prototype = {
	constructor: Conversation,

	updateSequenceIdx: function() {
		var self = this;
		_.each(self.sequence, function(telegram_obj, i) {
			self.sequence[i].idx = i;
		});
	},

	findTelegramByIdx: function(idx) {
		var self = this;
		var telegram_obj = _.find(self.sequence, function(tel) {
			return tel.idx === idx;
		});
		return telegram_obj;
	},

	//EJSON

	typeName: function() {
		return "Conversation";
	},

	equals: function(other) {
		return this._id == other._id &&
			this.name == other.name &&
			_.isEqual(this.sequence, other.sequence);
	},

	clone: function() {
		return new Conversation({
			_id: this._id,
			name: this.name,
			sequence: this.sequence
		});
	},

	toJSONValue: function() {
		var sequence_json = [];
		_.each(this.sequence, function(telegram_obj) {
			telegram_obj.telegram = telegram_obj.telegram.toJSONValue();
			sequence_json.push(telegram_obj);
		});

		return {
			_id: this._id,
			name: this.name,
			sequence: sequence_json
		};
	}
};

EJSON.addType("Conversation", Conversation.fromJSONValue);

if (Meteor.isServer) {
	//TODO Implementation conversation logic
}