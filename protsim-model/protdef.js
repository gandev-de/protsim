Protdef = new Meteor.Collection("protdef", {
	transform: function(coll) {
		//transform protocols in EJSON type protocol
		coll = Protocol.fromJSONValue(coll);
		return coll;
	}
});

if (Meteor.isClient) {
	Meteor.subscribe("protdef");
}

if (Meteor.isServer) {
	var saveProtocol = function(protocol, duplicate) {
		//TODO eventually persist embedded ejson type, 
		//TODO but its not possible to store as root document

		var protocol_json = protocol.toJSONValue();

		if (protocol._id && !duplicate) {
			Protdef.update({
				_id: protocol._id
			}, protocol_json);
			Log.info("protocol updated: " + protocol.name);
		} else {
			Protdef.insert(_.omit(protocol_json, '_id'));
			Log.info("protocol added: " + protocol.name);
		}
	};

	//init plain protsim instance with default protocol
    if(Protdef.find().count() === 0) {
		saveProtocol(new Protocol());
	}

	Meteor.publish("protdef", function() {
		return Protdef.find();
	});

	Meteor.methods({
		saveProtocol: function(protocol, duplicate) {
			protocol = protocol || new Protocol();
			duplicate = duplicate || false;

			saveProtocol(protocol, duplicate);
		},

		updateTelegram: function(protocol_id, telegram_id, values, telegram_name) {
			values = Telegram.recalculateOffset(values);

			var protocol = Protocol.fromJSONValue(Protdef.findOne({_id: protocol_id}));
			var telegram = protocol.findTelegramById(telegram_id);
			telegram_name = telegram_name || telegram.name;

			Protdef.update({
				_id: protocol_id,
				'telegrams._id': telegram_id
			}, {
				'$set': {
					'telegrams.$.values': values,
					'telegrams.$.name': telegram_name
				}
			});
			Log.info("telegram updated: " + telegram._id + " name: " + telegram_name);
		}
	});
}