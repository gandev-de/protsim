Template.protconversation.helpers({
	protocol: function() {
		return Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
	}
});