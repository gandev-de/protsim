Protlog = new Meteor.Collection("protlog");

addLogEntry = Meteor.bindEnvironment(function(protocol_id, telegram, raw_value, direction, conversation) {
	Protlog.insert({
		timestamp: new Date(),
		protocol_id: protocol_id,
		telegram: telegram,
		raw_value: raw_value,
		direction: direction,
		conversation: conversation
	});
}, function(err) {
	console.log(err);
});

if(Meteor.isClient) {
	Session.set("protlog_telegram_selected", null);
	Session.set("logging_active", false);
	Session.set("protlog_ready", false);

	Deps.autorun(function() {
		Session.set("protlog_ready", false);
		Meteor.subscribe("protlog", Session.get("protocol_selected"),
			Session.get("protlog_telegram_selected"), {
				onReady: function() {
					Session.set("protlog_ready", true);
				}
			});
	});
}

if(Meteor.isServer) {
	Meteor.publish("protlog", function(protocol_id, telegram_id) {
		//TODO add some filter e.g. telegram, time etc.
		return Protlog.find({
			protocol_id: protocol_id
		}, {sort: {timestamp: 1}});
	});

	Meteor.methods({
		clearLog: function() {
			Protlog.remove({});
		},

		startLogging: function(protocol) {
			if(Protwatchs) {
				Protwatchs[protocol._id].logging_active = true;
				console.log("start logging", protocol._id);
			}
		},

		stopLogging: function(protocol) {
			if(Protwatchs) {
				Protwatchs[protocol._id].logging_active = false;
				console.log("stop logging", protocol._id);
			}
		}
	});
}