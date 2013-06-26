Protlog = new Meteor.Collection("protlog");

if(Meteor.isClient) {
	Session.set("protlog_telegram_selected", null);
	Session.set("logging_active", false);

	Deps.autorun(function() {
		Meteor.subscribe("protlog", Session.get("protocol_selected"),
			Session.get("protlog_telegram_selected"));
	});
}

if(Meteor.isServer) {
	Meteor.publish("protlog", function(protocol_id, telegram_id) {
		return Protlog.find({
			protocol_id: protocol_id
			//, telegram_id: telegram_id
		});
	});

	Meteor.methods({
		addLogEntry: function(protocol_id, telegram, raw_value) {
			Protlog.insert({
				timestamp: new Date(),
				protocol_id: protocol_id,
				telegram: telegram,
				raw_value: raw_value
			});
		},

		clearLog: function() {
			Protlog.remove({});
		}
	});
}