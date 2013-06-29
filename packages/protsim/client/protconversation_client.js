Session.set("conversation_selected", null);
Session.set("participant_modal", null);
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
		return protocol.findConversationTelegramByIdx(
			Session.get("conversation_selected"),
			Session.get("telegram_selected_conversation"));
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

		var idx; //TODO

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
	}
});



Template.protconversation.rendered = function() {
	var self = this;
	self.node = self.find("svg");

	console.log("protconversation rendered");

	if (!self.handle) {
		self.handle = Deps.autorun(function() {
			var protocol = Protdef.findOne({
				_id: Session.get("protocol_selected")
			});
			var conv = protocol && protocol.findConversationByName(Session.get("conversation_selected")) || {};
			var conversation = conv.conversation || [];
			var telegram_idx_selected = Session.get("telegram_selected_conversation");

			var svg = d3.select(self.node);

			var sequence_diagram_height = 20 + conversation.length * 40;

			svg.attr("height", 70 + sequence_diagram_height);

			var markerWidth = 6,
				markerHeight = 6,
				cRadius = 30, // play with the cRadius value
				refX = cRadius + (markerWidth * 2),
				refY = -Math.sqrt(cRadius),
				drSub = cRadius + refY;

			//TODO participants (men in the middle)
			var participants = [{
					name: "Initiator",
					x: 5,
					y: 20
				}, {
					name: "Receiver",
					x: 300,
					y: 20
				}
			];

			var openModal = function(participant) {
				Session.set("participant_modal", participant);
				$('#conversationModal').modal('show');
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
				return 50;
			})
				.attr("width", function() {
				return 100;
			})
				.attr("fill", function(d) {
				return d.name == "Initiator" ? "green" : "red";
			})
				.attr("style", "cursor: pointer;")
				.on("click", function(d) {
				openModal(d.name);
			});

			//text participants
			var text = svg.selectAll(".participant_text")
				.data(participants)
				.enter().append("svg:text").attr("x", function(d) {
				return d.x + 20;
			})
				.attr("class", "participant_text")
				.attr("y", function(d) {
				return d.y + 30;
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
				return d.x + 50;
			})
				.attr("y1", function(d) {
				return d.y + 50;
			})
				.attr("x2", function(d) {
				return d.x + 50;
			})
				.attr("y2", function(d) {
				return d.y + 50 + sequence_diagram_height;
			})
				.attr("style", "stroke-dasharray: 9, 5;stroke: blue; stroke-width: 3");

			//path between participants

			// Per-type markers, as they don't inherit styles.
			svg.select("defs").selectAll("marker")
				.data(["send", "receive"])
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
				return d == "send" ? "green" : "red";
			});

			if (conversation.length > 0) {

				//add rectangle enclosing the selected telegram
				if(telegram_idx_selected >= 0) {
					var pos = {x: 30, y: 75 + telegram_idx_selected * 40};

					svg.select(".telegram_select_conversation")
						.attr("class", "telegram_select_conversation")
						.attr("x", pos.x)
						.attr("y", pos.y)
						.attr("height", 35)
						.attr("width", 345)
						.attr("style", 'stroke-width: 5; fill: none')
						.attr("stroke", "yellow")
						.attr("display", '');
				} else {
					svg.select(".telegram_select_conversation").attr("display", 'none');
				}

				//add conversation path
				var path = svg.selectAll(".conversation_path")
					.data(conversation)
					.enter()
					.append("svg:path")
					.attr("class", function(d) {
					return "conversation_path " + "link " + d.type;
				})
					.attr("marker-end", function(d) {
					return "url(#" + d.type + ")";
				})
					.attr("d", function(d) {
					var y = 100 + d.idx * 40;

					if (d.type == "send") {
						return "M 55 " + y + " L 340 " + y;
					} else /* receive */ {
						return "M 350 " + y + " L 65 " + y;
					}
				})
					.attr("style", 'stroke-width: 2; fill: none')
					.attr("cursor", "pointer")
					.attr("stroke", function(d) {
					return d.type == "send" ? "green" : "red";
				})
					.on('click', function(d, i) {
						Session.set("telegram_selected_conversation", i);
				});

				//text telegram name
				var path_text_y_offset = 0;
				var text_tel = svg.selectAll(".telegram_text")
					.data(conversation)
					.enter()
					.append("svg:text")
					.attr("class", "telegram_text")
					.attr("cursor", "pointer")
					.attr("x", function(d) {
					return 170; //TODO calculate
				})
					.attr("y", function(d) {
					var y = 100 + d.idx * 40;
					return y - 5;
				})
					.attr("fill", function(d) {
					return d.type == "send" ? "green" : "red";
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
};

/* modal template */

Template.modal.events({
	'click .add_conversation_telegram': function(evt, tmpl) {
		var protocol = Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
		var telegram = protocol.findTelegramById(conversation_telegram);
		var conversation = protocol.findConversationByName(Session.get("conversation_selected"));

		var type = Session.get("participant_modal") == "Receiver" ? "receive" : "send";
		var idx = conversation.conversation.length;
		conversation.conversation.push({
			type: type,
			telegram: telegram,
			idx: idx
		});

		Meteor.call("updateProtocolConversation",
			Session.get("protocol_selected"),
			conversation);

		Session.set("telegram_selected_conversation", -1);

		//TODO select inserted telegram in a better way
		// Protdef.find({
		// 	_id: Session.get("protocol_selected")
		// }).observe({
		// 	changed: function(protocol) {
		// 		var conv = protocol.findConversationByName(Session.get("conversation_selected"));
		// 		Session.set("telegram_selected_conversation", conv.conversation.length - 1);
		// 	}
		// });
	}
});

Template.modal.helpers({
	modal_participant: function() {
		return Session.get("participant_modal");
	}
});