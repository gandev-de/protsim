Session.set("conversation_selected", null);
Session.set("participant_modal", null);
Session.set("participant_direction_modal", null);
Session.set("telegram_selected_conversation", -1);

Template.protconversation.helpers({
	protocol: function() {
		return Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
	},

	selected_conversation: function() {
		var conversation = this;
		return Session.equals("conversation_selected", conversation.name) ? 'selected' : '';
	},

	conversation_telegram: function() {
		var protocol = Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
		var telegram_obj = protocol.findConversationTelegramByIdx(
			Session.get("conversation_selected"),
			Session.get("telegram_selected_conversation"));
		return telegram_obj ? telegram_obj.telegram: undefined;
	}
});

var conversation_telegram = null;

Template.protconversation.events({
	'click .select_conversation': function(evt, tmpl) {
		var conversation = this;
		Session.set("conversation_selected", conversation.name);
	},

	'change #conversation_telegram': function(evt, tmpl) {
		var protocol = this;

		console.log(evt.srcElement.selectedOptions);
		var telegram_id = evt.srcElement.selectedOptions['0'].value;
		console.log(telegram_id);

		conversation_telegram = telegram_id;
	},

	'click #add_conversation': function(evt, tmpl) {
		var protocol = this;

		protocol.conversations.push({
			name: "conversation_" + protocol.conversations.length, //TODO unique
			conversation: []
		});
		Meteor.call("saveProtocol", protocol);
	},

	'click #remove_conversation': function(evt, tmpl) {
		var protocol = this;
		var conversation_name = Session.get("conversation_selected");
		protocol.conversations = _.filter(protocol.conversations, function(conversation) {
			return conversation.name != conversation_name;
		});
		Meteor.call("saveProtocol", protocol);
	},

	'click #save_conversation_telegram': function(evt, tmpl) {
		var protocol = Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
		var telegram = protocol.findTelegramById(conversation_telegram);
		var conversation = protocol.findConversationByName(Session.get("conversation_selected"));

		for (var i = 0; i < telegram.values.length; i++) {
			var value = telegram.values[i];
			var value_html = tmpl.find("#send_conversation_" + value.name).value;

			telegram.values[i].current = value_html;
		}

		var idx = Session.get("telegram_selected_conversation");

		for (var j = 0; j < conversation.conversation.length; j++) {
			var telegram_obj = conversation.conversation[j];
			if (telegram_obj.idx == idx) {
				telegram_obj.telegram = telegram;
				conversation.conversation[j] = telegram_obj;
			}
		}

		Meteor.call("updateProtocolConversation",
			Session.get("protocol_selected"),
			conversation);
	},

	'click #remove_conversation_telegram': function(evt, tmpl) {
		var protocol = Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
		var conversation = protocol.findConversationByName(Session.get("conversation_selected"));

		var idx = Session.get("telegram_selected_conversation");

		conversation.conversation = _.filter(conversation.conversation, function(telegram_obj) {
			return telegram_obj.idx != idx;
		});

		Meteor.call("updateProtocolConversation",
			Session.get("protocol_selected"),
			conversation);

		Session.set("telegram_selected_conversation", -1);
	}
});

//TODO participants (men in the middle)
var participants = [];

participants.width = 110;
participants.height = 50;

participants.push({
		name: "INITIATOR",
		x: 0,
		y: 20,
		text_x: 20,
		text_y: 50,
		endpoint_x: participants.width/2
	});

participants.push({
		name: "PROTSIM",
		x: 200,
		y: 20,
		text_x: 222,
		text_y: 50,
		endpoint_x: 200 + participants.width/2
	});

participants.push({
		name: "RESPONDER",
		x: 400,
		y: 20,
		text_x: 411,
		text_y: 50,
		endpoint_x: 400 + participants.width/2
	});

var svg_y_offset = 20;
var sequence_height = 50;
var markerWidth = 6, markerHeight = 6;

Template.protconversation.rendered = function() {
	var self = this;
	self.node = self.find("svg");

	console.log("protconversation rendered");

	if (!self.handle) {
		self.handle = Deps.autorun(function() {
			var protocol = Protdef.findOne({
				_id: Session.get("protocol_selected")
			});
			self.conv_sel = Session.get("conversation_selected");
			var conv = self.conv_sel ? protocol.findConversationByName(self.conv_sel) : {conversation: []};
			var conversation = conv.conversation;
			var telegram_idx_selected = Session.get("telegram_selected_conversation");

			var svg = d3.select(self.node);

			var sequence_diagram_height = svg_y_offset + conversation.length * sequence_height;

			svg.attr("height", participants.height + svg_y_offset + sequence_diagram_height);

			var openModal = function(participant, direction) {
				if(self.conv_sel) {
					Session.set("participant_modal", participant);
					Session.set("participant_direction_modal", _direction_str(participant, direction));
					$('#conversationModal').modal('show');
				}
			};

			//rect participants
			svg.selectAll(".participant")
				.data(participants)
				.enter()
				.append("svg:rect")
				.attr("class", "participant")
				.attr("x", function(d) {
				return d.x;
			})
				.attr("y", function(d) {
				return d.y;
			})
				.attr("height", function() {
				return participants.height;
			})
				.attr("width", function() {
				return participants.width;
			})
				.attr("fill", function(d) {
					switch(d.name) {
						case participants[0].name: return 'green';
						case participants[1].name: return 'blue';
						case participants[2].name: return 'red';
						default: return 'red';
					}
			})
				.attr("style", "cursor: pointer;")
				.on("click", function(d) {
				openModal(d.name);
			});

			var x_protsim = participants[1].x;
			var y_protsim_end = participants[1].y + participants.height;
			var protsim_interface_width = 50;
			var protsim_interface_height = 20;
			svg.selectAll(".protsim_interfaces")
				.data([{direction: 'i', x: x_protsim, y: y_protsim_end},
					{direction: 'r', x: x_protsim + (participants.width - protsim_interface_width), y: y_protsim_end}])
				.enter()
				.append("svg:rect")
				.attr("class", "protsim_interfaces")
				.attr("x", function(d) {
				return d.x;
			})
				.attr("y", function(d) {
				return d.y;
			})
				.attr("height", function() {
				return protsim_interface_height;
			})
				.attr("width", function() {
				return protsim_interface_width;
			})
				.attr("fill", function(d, i) {
					switch(i) {
						case 0: return 'green';
						case 1: return 'red';
						default: return 'red';
					}
			})
				.attr("style", "cursor: pointer;")
				.on("click", function(d) {
				openModal(participants[1].name, d.direction);
			});

			//text participants
			var text = svg.selectAll(".participant_text")
				.data(participants)
				.enter().append("svg:text").attr("x", function(d) {
				return d.text_x;
			})
				.attr("class", "participant_text")
				.attr("y", function(d) {
				return d.text_y;
			})
				.attr("fill", "white")
				.text(function(d) {
				return d.name;
			})
				.attr("style", "cursor: pointer;")
				.on("click", function(d) {
				openModal(d.name);
			});

			//horizontal lines for endpoints

			//TODO allways remove because line length was not dynamically adjusting
			svg.selectAll(".endpoints").remove();
			var endpoints = svg.selectAll(".endpoints")
				.data(participants)
				.enter()
				.append("svg:line")
				.attr("class", "endpoints")
				.attr("x1", function(d) {
				return d.endpoint_x;
			})
				.attr("y1", function(d) {
				return d.y + sequence_height;
			})
				.attr("x2", function(d) {
				return d.endpoint_x;
			})
				.attr("y2", function(d) {
				return d.y + sequence_height + sequence_diagram_height;
			})
				.attr("style", "stroke-dasharray: 9, 5;stroke: black; stroke-width: 3");

			//path between participants

			// Per-type markers, as they don't inherit styles.
			svg.select("defs").selectAll("marker")
				.data(["ip", "pi", "pr", "rp"])
				.enter().append("svg:marker")
				.attr("id", String)
				.attr("viewBox", "0 -5 10 10")
				.attr("markerWidth", markerWidth)
				.attr("markerHeight", markerHeight)
				.attr("orient", "auto")
				.append("svg:path")
				.attr("d", "M0,-5L10,0L0,5")
			//.attr("style", "fill: red;");
			.attr("fill", function(d) {
				return _direction(d).color;
			});

			if (conversation.length > 0) {

				//add rectangle enclosing the selected telegram
				if(telegram_idx_selected >= 0) {
					var select_rect_width = 220;
					var select_rect_height = 40;

					var telegram_obj = protocol.findConversationTelegramByIdx(self.conv_sel, telegram_idx_selected);
					var direction = _direction(telegram_obj.direction);
					var y = svg_y_offset + 2 * sequence_height + telegram_idx_selected * sequence_height;
					var x = direction.x1 < direction.x2 ? direction.x1 - 10 : direction.x2 - 20;

					svg.select(".telegram_select_conversation")
						.attr("class", "telegram_select_conversation")
						.attr("x", x)
						.attr("y", y - select_rect_height/1.5)
						.attr("height", select_rect_height)
						.attr("width", select_rect_width)
						.attr("style", 'stroke-width: 5; fill: none')
						.attr("stroke", "yellow")
						.attr("display", '');
				} else {
					svg.select(".telegram_select_conversation").attr("display", 'none');
				}

				//add conversation path

				//TODO really neccessary?
				svg.selectAll(".conversation_path").remove();
				var path = svg.selectAll(".conversation_path")
					.data(conversation)
					.enter()
					.append("svg:path")
					.attr("class", function(d) {
					return "conversation_path " + "link " + _direction(d.direction).class;
				})
					.attr("marker-end", function(d) {
					return "url(#" + _direction(d.direction).class + ")";
				})
					.attr("d", function(d) {
					var y = svg_y_offset + 2 * sequence_height + d.idx * sequence_height;
					var direction = _direction(d.direction);
					return "M " + direction.x1 + " " + y + " L "  + direction.x2 + " " + y;
				})
					.attr("style", 'stroke-width: 2; fill: none')
					.attr("cursor", "pointer")
					.attr("stroke", function(d) {
					return _direction(d.direction).color;
				})
					.on('click', function(d, i) {
						Session.set("telegram_selected_conversation", i);
				});

				//text telegram name

				//TODO really neccessary?
				svg.selectAll(".telegram_text").remove();
				var path_text_y_offset = 0;
				var text_tel = svg.selectAll(".telegram_text")
					.data(conversation)
					.enter()
					.append("svg:text")
					.attr("class", "telegram_text")
					.attr("cursor", "pointer")
					.attr("x", function(d) {
					return _direction(d.direction).tel_text_x;
				})
					.attr("y", function(d) {
					var y = svg_y_offset + 2 * sequence_height + d.idx * sequence_height;
					return y - 5;
				})
					.attr("fill", function(d) {
					return _direction(d.direction).color;
				})
					.text(function(d) {
					return d.telegram.name;
				})
					.on('click', function(d, i) {
						Session.set("telegram_selected_conversation", i);
				});
			}
		});
	}

	function _direction_str(participant, direction) {
		switch(participant) {
			case 'INITIATOR': return 'ip';
			case 'PROTSIM': return 'p' + (direction || 'r');
			case 'RESPONDER': return 'rp';
		}
	}

	function _direction(direction) {
		//TODO calculate tel_text_x
		switch(direction) {
			case 'ip':
				return {color: "green", class:"ip", tel_text_x: participants.width/2 + 30, x1: 55, x2: 255 - markerWidth*2};
			case 'pi':
				return {color: "blue", class:"pi", tel_text_x: participants.width/2 + 30, x1: 255, x2: 55 + markerWidth*2};
			case 'pr':
				return {color: "blue", class:"pr", tel_text_x: 200 + participants.width/2 + 30, x1: 255, x2: 455 - markerWidth*2};
			case 'rp':
				return {color: "red", class:"rp", tel_text_x: 200 + participants.width/2 + 30, x1: 455, x2: 255 + markerWidth*2};
		}
	}
};

/* modal template */

Template.modal.events({
	'click .add_conversation_telegram': function(evt, tmpl) {
		var protocol = Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
		var telegram = protocol.findTelegramById(conversation_telegram);
		var conversation = protocol.findConversationByName(Session.get("conversation_selected"));

		var direction = Session.get("participant_direction_modal");
		var idx = conversation.conversation.length;
		conversation.conversation.push({
			direction: direction,
			telegram: telegram,
			idx: idx
		});

		Meteor.call("updateProtocolConversation",
			Session.get("protocol_selected"),
			conversation);

		Session.set("telegram_selected_conversation", -1);

		//TODO select inserted telegram in a better way
		// Protdef.find({
		//	_id: Session.get("protocol_selected")
		// }).observe({
		//	changed: function(protocol) {
		//		var conv = protocol.findConversationByName(Session.get("conversation_selected"));
		//		Session.set("telegram_selected_conversation", conv.conversation.length - 1);
		//}
		// });
	}
});

Template.modal.helpers({
	modal_participant: function() {
		return Session.get("participant_modal");
	}
});