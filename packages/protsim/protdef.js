Protdef = new Meteor.Collection("protdef");

if(Meteor.isClient) {
	Protwatch = new Meteor.Collection("protwatch", {
		transform: function (coll) {
			if(coll && coll.value)
				coll.value = EJSON.parse(coll.value);
			return coll;
		}
	});

	Meteor.subscribe("protdef");
}

if(Meteor.isServer) {
	Meteor.publish("protdef", function () {
		return Protdef.find();
	});

	Meteor.methods({
		saveProtocol: function (protocol) {
			Protdef.insert({protocol: protocol.toJSONValue()});
		}
	});
}