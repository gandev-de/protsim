Telegrams = new Meteor.Collection("telegrams");
Interfaces = new Meteor.Collection("interfaces");

if(Meteor.isClient) {
	Protdef = new Meteor.Collection("protocols", {
		transform: function (coll) {
			coll.interface = Interfaces.findOne({_id: coll.interface});

			if(coll.interface) {
				coll.interface = Interface.fromJSONValue(coll.interface);

				for(var i = 0; i < coll.telegrams.length; i++) {
					var telegram = coll.telegrams[i];
					telegram = Telegrams.findOne({_id: telegram});
					if(telegram) {
						telegram = Telegram.fromJSONValue(telegram);
					}
					coll.telegrams[i] = telegram;
				}
				return Protocol.fromJSONValue(coll);
			}
		}
	});

	Meteor.subscribe("protdef");
}

if(Meteor.isServer) {
	Protocols = new Meteor.Collection("protocols");

	Meteor.publish("protdef", function () {
		return [
			Telegrams.find(),
			Interfaces.find(),
			Protocols.find() //order matters!
		];
	});

	Meteor.methods({
		saveProtocol: function (protocol) {
			var interface_json = protocol.interface.toJSONValue();

			var interface_id = interface_json._id;
			if(!interface_id) {
				interface_id =  Interfaces.insert(_.omit(interface_json, '_id'));
			}

			var telegram_ids = [];
			protocol.telegrams.forEach(function (telegram) {
				var telegram_json = telegram.toJSONValue();
				var telegram_id = telegram._id;
				if(!telegram_id) {
					telegram_id = Telegrams.insert(_.omit(telegram_json, '_id'));
				}
				telegram_ids.push(telegram_id);
			});

			var protocol_json = protocol.toJSONValue();
			protocol_json.interface = interface_id;
			protocol_json.telegrams = telegram_ids;

			if(protocol._id) {
				Protocols.update({_id: protocol._id}, protocol_json);
			} else {
				Protocols.insert(_.omit(protocol_json, '_id'));
			}
		}
	});
}