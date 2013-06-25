if (Meteor.isClient) {
	Handlebars.registerHelper("navClassFor", function(nav, options) {
		return Meteor.router.navEquals(nav) ? "active": "";
	});

	Meteor.pages({
		'/': {to: 'protdef', nav: 'definition'},
		'/definition': {to: 'protdef', nav: 'definition'},
		'/watch': {to: 'protwatch', nav:'watch'},
		'/log': {to: 'protlog', nav:'log'}
	}, {
		defaults: {
			layout: 'layout'
		}
	});
}