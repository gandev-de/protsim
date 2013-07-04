if (Meteor.isClient) {
	Protdef = new Meteor.Collection("protocols", {
		transform: function(coll) {
			coll.send_interface = Interface.fromJSONValue(coll.send_interface);
			coll.recv_interface = Interface.fromJSONValue(coll.recv_interface);

			if (coll.send_interface && coll.recv_interface) {
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

	var saveProtocol = function(protocol, duplicate) {
		//TODO try to persist embedded ejson types

		protocol = protocol || new Protocol();
		duplicate = duplicate || false;

		var send_interface_json = protocol.send_interface.toJSONValue();
		send_interface_json._id = new Meteor.Collection.ObjectID()._str;

		var recv_interface_json = protocol.recv_interface.toJSONValue();
		recv_interface_json._id = new Meteor.Collection.ObjectID()._str;

		var telegrams_json = [];
		protocol.telegrams.forEach(function(telegram) {
			var telegram_json = telegram.toJSONValue();
			telegram_json._id = new Meteor.Collection.ObjectID()._str;
			telegrams_json.push(telegram_json);
		});

		var protocol_json = protocol.toJSONValue();
		protocol_json.send_interface = send_interface_json;
		protocol_json.recv_interface = recv_interface_json;
		protocol_json.telegrams = telegrams_json;

		if (protocol._id && !duplicate) {
			Protocols.update({
				_id: protocol._id
			}, protocol_json);
			console.log("protocol updated: ", protocol_json.name);
		} else {
			Protocols.insert(_.omit(protocol_json, '_id'));
			console.log("protocol added: ", protocol_json.name);
		}
	};

	//init plain protsim instance with default protocol
    if(Protocols.find().count() === 0) {
		saveProtocol(new Protocol());
	}

	Meteor.publish("protdef", function() {
		return Protocols.find(); //order matters!
	});

	Meteor.methods({
		saveProtocol: function(protocol, duplicate) {
			protocol = protocol || new Protocol();
			duplicate = duplicate || false;

			saveProtocol(protocol, duplicate);
		},

		updateTelegram: function(protocol_id, telegram_id, values, telegram_name) {
			values = Telegram.recalculateOffset(values);

			var protocol = Protocol.fromJSONValue(Protocols.findOne({_id: protocol_id}));
			var telegram = protocol.findTelegramById(telegram_id);
			telegram_name = telegram_name || telegram.name;

			Protocols.update({
				_id: protocol_id,
				'telegrams._id': telegram_id
			}, {
				'$set': {
					'telegrams.$.values': values,
					'telegrams.$.name': telegram_name
				}
			});
			console.log("telegram updated: ", telegram._id, " name: ", telegram_name);
		}
	});
}