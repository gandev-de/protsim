Telegrams = new Meteor.Collection("telegrams");
Interfaces = new Meteor.Collection("interfaces");

Protdef = new Meteor.Collection("protdef", {
			transform: function (coll) {
				coll.interface = Interfaces.findOne({_id: coll.interface});

				for(var i = 0; i < coll.telegrams.length; i++) {
					coll.telegrams[i] = Telegrams.find({_id: coll.telegrams[i]}).fetch();
				}

				console.log(coll);

				return coll;
			}
		});

if(Meteor.isClient) {
	Protwatch = new Meteor.Collection("protwatch", {
		transform: function (coll) {
			if(coll && coll.value)
				coll.value = EJSON.parse(coll.value);
			return coll;
		}
	});

	Meteor.subscribe("protdef");
	Meteor.subscribe("telegrams");
	Meteor.subscribe("interfaces");
}

if(Meteor.isServer) {
	Meteor.publish("protdef", function () {
		return Protdef.find({});
	});

	Meteor.publish("telegrams", function () {
		return Telegrams.find({});
	});

	Meteor.publish("interfaces", function () {
		return Interfaces.find({});
	});

	Meteor.methods({
		saveProtocol: function (protocol) {
			var interface_id = Interfaces.insert(protocol.interface.toJSONValue());

			var telegram_ids = [];
			protocol.telegrams.forEach(function (telegram) {
				telegram_ids.push(Telegrams.insert(telegram.toJSONValue()));
			});

			protocol = protocol.toJSONValue();
			protocol.interface = interface_id;
			protocol.telegrams = telegram_ids;

			Protdef.insert(protocol);
		}
	});
}