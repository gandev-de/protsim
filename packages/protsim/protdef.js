if (Meteor.isClient) {
	Protdef = new Meteor.Collection("protocols", {
		transform: function(coll) {
			coll.interface = Interface.fromJSONValue(coll.interface);

			if (coll.interface) {
				for (var i = 0; i < coll.telegrams.length; i++) {
					var telegram = coll.telegrams[i];
					telegram = Telegram.fromJSONValue(telegram);
					coll.telegrams[i] = telegram;
				}
				return Protocol.fromJSONValue(coll);
			}
		}
	});

	Meteor.subscribe("protdef");
}

if (Meteor.isServer) {
	Protocols = new Meteor.Collection("protocols");

	Meteor.publish("protdef", function() {
		return Protocols.find(); //order matters!
	});

	Meteor.methods({
		saveProtocol: function(protocol) {
			var interface_json = protocol.interface.toJSONValue();
			interface_json._id = new Meteor.Collection.ObjectID()._str;

			var telegrams_json = [];
			protocol.telegrams.forEach(function(telegram) {
				var telegram_json = telegram.toJSONValue();
				telegram_json._id = new Meteor.Collection.ObjectID()._str;
				telegrams_json.push(telegram_json);
			});

			var protocol_json = protocol.toJSONValue();
			protocol_json.interface = interface_json;
			protocol_json.telegrams = telegrams_json;

			if (protocol._id) {
				Protocols.update({
					_id: protocol._id
				}, protocol_json);
			} else {
				Protocols.insert(_.omit(protocol_json, '_id'));
			}
		},

		updateTelegram: function(protocol_id, telegram_id, values) {
			Protocols.update({
		      _id: protocol_id,
		      'telegrams._id': telegram_id
		    }, {
		      '$set': {
		        'telegrams.$.values': values
		      }
		    });
		}
	});
}