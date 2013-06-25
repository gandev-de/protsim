var logging_handle;

Template.protlog.helpers({
	protocol: function() {
		return Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
	},

	logging: function() {
		return Session.get("logging_active") ? 'checked' : '';
	},

	protlog: function() {
		return Protlog.find();
	},

	protlog_protocol: function() {
		var protlog_entry = this;
		return Protdef.findOne({_id: protlog_entry.protocol_id});
	},

	protlog_telegram: function() {
		var protlog_entry = this;
		var protocol = Protdef.findOne({_id: protlog_entry.protocol_id});
		return protocol.findTelegramById(protlog_entry.telegram_id);
	}
});

Template.protlog.events({
	'click #start_logging': function(evt, tmpl) {
		var protocol_id = Session.get("protocol_selected");
		var telegram_id = Session.get("telegram_selected_watch");
		if(logging_handle && logging_handle.stop) {
			logging_handle.stop();
		}

		logging_handle = Protwatch.find().observeChanges({
			changed: function(id, fields) {
				console.log(fields);

				//TODO logging to other destination

				Meteor.call("addLogEntry", protocol_id, telegram_id);
			}
		});
		Session.set("logging_active", true);
	},

	'click #clear_log': function(evt, tmpl) {
		Meteor.call("clearLog");
	}
});