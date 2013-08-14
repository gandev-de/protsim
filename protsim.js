Router.map(function() {
	var self = this;

	self.route('protdef', {
		path: '/'
	});

	self.route('protwatch', {
		path: '/protwatch'
	});

	self.route('protconversation', {
		path: '/protconversation'
	});

	self.route('protlog', {
		path: '/protlog'
	});
});

if (Meteor.isClient) {
	Router.configure({
		layout: 'layout',
		notFoundTemplate: 'notFound',
		loadingTemplate: 'loading'
	});

	Handlebars.registerHelper("navClassFor", function(nav, options) {
		return Router._current === nav ? "active" : "";
	});
}