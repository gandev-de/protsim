var logging_handle;

Session.set("mouseover_log_entry", null);

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
		return Protdef.findOne({_id: protlog_entry.protocol_id}).name;
	},

	protlog_telegram: function() {
		var protlog_entry = this;
		var protocol = Protdef.findOne({_id: protlog_entry.protocol_id});
		return protocol.findTelegramById(protlog_entry.telegram_id);
	},

	mouseover_log_entry: function() {
		return Protlog.findOne(Session.get("mouseover_log_entry"));
	},

	timestamp_formatted: function(timestamp) {
		return new Date(timestamp).toString('dd.MM.yyyy HH:mm:ss');
	}
});

Template.protlog.events({
	'click #start_logging': function(evt, tmpl) {
		var protocol_id = Session.get("protocol_selected");

		var protocol = Protdef.findOne({_id: protocol_id});
		var telegram = protocol.findTelegramById(Session.get("telegram_selected_watch"));
		if(logging_handle && logging_handle.stop) {
			logging_handle.stop();
		}

		logging_handle = Protwatch.find().observeChanges({
			changed: function(id, fields) {
				var telegram;
				if(fields.value) {
					telegram = EJSON.parse(fields.value);
				}

				//TODO logging to other destination

				Meteor.call("addLogEntry", protocol_id, telegram, fields.raw);
			}
		});
		Session.set("logging_active", true);
	},

	'click #clear_log': function(evt, tmpl) {
		Meteor.call("clearLog");
	},

	'mouseover .log_entry': function(evt, tmpl) {
		var log_entry_id = evt.currentTarget.id;
		Session.set("mouseover_log_entry", log_entry_id);
	},

	'mouseout .log_entry': function(evt, tmpl) {
		Session.set("mouseover_log_entry", null);
	}
});