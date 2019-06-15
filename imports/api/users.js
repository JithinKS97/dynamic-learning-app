/* eslint-disable meteor/audit-argument-checks */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-nested-ternary */
import SimpleSchema from 'simpl-schema';
import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';
import { ServiceConfiguration } from 'meteor/service-configuration';

export const validateNewUser = (user) => {
  const email = user.services.github ? user.services.github.email
    : (user.services.google ? user.services.google.email : user.emails[0].address);
  new SimpleSchema({
    email: {
      type: String,
      regEx: SimpleSchema.RegEx.Email,
    },
  }).validate({ email });
  return true;
};

Meteor.methods({
  getUsername(_id) {
    const user = Meteor.users.findOne({ _id });
    if (user) {
      return user.username;
    }
  },
  getUsernames(_idArray) {
    const users = Meteor.users.find({}).fetch();
    const usersMap = {};
    users.map((user) => {
      usersMap[user._id] = { userId: user._id, username: user.username };
    });
    return _idArray.map(_id => usersMap[_id]);
  },
  updateSchool(username, school) {
    Meteor.users.update({ username }, { $set: { school } });
  },

  addClass(username, classcode) {
    Meteor.users.update({ username }, { $push: { classes: classcode } });
  },
  deleteAllClasses(username) {
    Meteor.users.update({ username }, { $set: { classes: [] } });
  },
  removeUser(username) {
    Meteor.users.remove({ username });
  },
});

if (Meteor.isServer) {
  Accounts.validateNewUser(validateNewUser);
  Meteor.publish('getAccounts', () => Meteor.users.find());
  const { settings: { google } } = Meteor;
  const { settings: { github } } = Meteor;

  ServiceConfiguration.configurations.upsert({
    service: 'github',
  }, {
    $set: {
      clientId: github.clientId,
      loginStyle: 'popup',
      secret: github.secret,
    },
  });

  ServiceConfiguration.configurations.upsert({
    service: 'google',
  }, {
    $set: {
      clientId: google.clientId,
      loginStyle: 'popup',
      secret: google.secret,
    },
  });
}
