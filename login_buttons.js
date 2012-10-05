(function () {
  //
  // Session
  //

  var DROPDOWN_VISIBLE_KEY = 'Meteor.loginButtons.dropdownVisible';

  // XXX consider replacing these with one key that has an enum for values.
  var IN_SIGNUP_FLOW_KEY = 'Meteor.loginButtons.inSignupFlow';
  var IN_FORGOT_PASSWORD_FLOW_KEY = 'Meteor.loginButtons.inForgotPasswordFlow';
  var IN_CHANGE_PASSWORD_FLOW_KEY = 'Meteor.loginButtons.inChangePasswordFlow';

  var ERROR_MESSAGE_KEY = 'Meteor.loginButtons.errorMessage';
  var INFO_MESSAGE_KEY = 'Meteor.loginButtons.infoMessage';
  var RESET_PASSWORD_TOKEN_KEY = 'Meteor.loginButtons.resetPasswordToken';
  var ENROLL_ACCOUNT_TOKEN_KEY = 'Meteor.loginButtons.enrollAccountToken';
  var JUST_VALIDATED_USER_KEY = 'Meteor.loginButtons.justValidatedUser';
  var CONFIGURE_LOGIN_SERVICES_DIALOG_VISIBLE = 'Meteor.loginButtons.configureLoginServicesDialogVisible';
  var CONFIGURE_LOGIN_SERVICES_DIALOG_SERVICE_NAME = "Meteor.loginButtons.configureLoginServicesDialogServiceName";
  var CONFIGURE_LOGIN_SERVICES_DIALOG_SAVE_ENABLED = "Meteor.loginButtons.saveEnabled";


  var resetSession = function () {
    Session.set(IN_SIGNUP_FLOW_KEY, false);
    Session.set(IN_FORGOT_PASSWORD_FLOW_KEY, false);
    Session.set(IN_CHANGE_PASSWORD_FLOW_KEY, false);
    Session.set(DROPDOWN_VISIBLE_KEY, false);
    resetMessages();
  };

  var resetMessages = function () {
    Session.set(ERROR_MESSAGE_KEY, null);
    Session.set(INFO_MESSAGE_KEY, null);
  };


  //
  // loginButtons template
  //

  configureService = function(name) {
    Session.set(CONFIGURE_LOGIN_SERVICES_DIALOG_VISIBLE, true);
    Session.set(CONFIGURE_LOGIN_SERVICES_DIALOG_SERVICE_NAME, name);
    Session.set(CONFIGURE_LOGIN_SERVICES_DIALOG_SAVE_ENABLED, false);
  };

  Template.loginButtons.events = {
    'click #login-buttons-facebook': function () {
      resetMessages();
      Meteor.loginWithFacebook(makeLoginCallback('facebook'));
    },

    'click #login-buttons-google': function () {
      resetMessages();
      Meteor.loginWithGoogle(makeLoginCallback('google'));
    },

    'click #login-buttons-github': function () {
      resetMessages();
      Meteor.loginWithGithub(makeLoginCallback('github'))
    },

    'click #login-buttons-weibo': function () {
      resetMessages();
      Meteor.loginWithWeibo(makeLoginCallback('weibo'));
    },

    'click #login-buttons-twitter': function () {
      resetMessages();
      Meteor.loginWithTwitter(makeLoginCallback('twitter'));
    },

    'click #login-name-link': function () {
      Session.set(DROPDOWN_VISIBLE_KEY, true);
      Meteor.flush();
      correctDropdownZIndexes();
    },

    'click .login-close-text': function () {
      resetSession();
    },

    'click #login-buttons-open-change-password': function() {
      resetMessages();
      Session.set(IN_CHANGE_PASSWORD_FLOW_KEY, true);
    },

    'click #login-buttons-logout': function() {
      Meteor.logout(resetSession);
    }
  };

  var makeLoginCallback = function(service) {
    return function (e) {
      if (!e) {
        resetSession();
      } else if (e instanceof Accounts.LoginCancelledError) {
        // do nothing
      } else if (e instanceof Accounts.ConfigError) {
        configureService(service);
      } else {
        Session.set(ERROR_MESSAGE_KEY, e.reason || "Unknown error");
      }
    };
  };

  // decide whether we should show a dropdown rather than a row of
  // buttons
  Template.loginButtons.dropdown = function () {
    var services = getLoginServices();

    var hasPasswordService = _.any(services, function (service) {
      return service.name === 'password';
    });

    return hasPasswordService || services.length > 1;
  };

  Template.loginButtons.services = function () {
    return getLoginServices();
  };

  Template.loginButtons.configurationLoaded = function () {
    return Accounts.loginServicesConfigured();
  };


  //
  // loginButtonsLoggedInRow template
  //
  Template.loginButtonsLoggedInRow.displayName = function () {
    return displayName();
  };


  //
  // loginButtonsLoggedInDropdown template
  //

  Template.loginButtonsLoggedInDropdown.displayName = function () {
    return displayName();
  };

  Template.loginButtonsLoggedInDropdown.inChangePasswordFlow = function () {
    return Session.get(IN_CHANGE_PASSWORD_FLOW_KEY);
  };

  Template.loginButtonsLoggedInDropdown.dropdownVisible = function () {
    return Session.get(DROPDOWN_VISIBLE_KEY);
  };

  Template.loginButtonsLoggedInDropdown.allowChangingPassword = function () {
    // it would be more correct to check whether the user has a password set,
    // but in order to do that we'd have to send more data down to the client,
    // and it'd be preferable not to send down the entire service.password document.
    //
    // instead we use the heuristic: if the user has a username or email set.
    var user = Meteor.user();
    return user.username || (user.emails && user.emails[0] && user.emails[0].address);
  };


  //
  // loginButtonsServiceRow template
  //

  Template.loginButtonsServicesRow.events = {
    'click #login-buttons-password': function () {
      loginOrSignup();
    },
    'click #signup-link': function () {
      resetMessages();

      // store values of fields before swtiching to the signup form
      var username = elementValueById('login-username');
      var email = elementValueById('login-email');
      var usernameOrEmail = elementValueById('login-username-or-email');
      var password = elementValueById('login-password');

      Session.set(IN_SIGNUP_FLOW_KEY, true);
      Session.set(IN_FORGOT_PASSWORD_FLOW_KEY, false);
      // force the ui to update so that we have the approprate fields to fill in
      Meteor.flush();

      // update new fields with appropriate defaults
      if (username !== null)
        document.getElementById('login-username').value = username;
      else if (email !== null)
        document.getElementById('login-email').value = email;
      else if (usernameOrEmail !== null)
        if (usernameOrEmail.indexOf('@') === -1)
          document.getElementById('login-username').value = usernameOrEmail;
        else
          document.getElementById('login-email').value = usernameOrEmail;

      document.getElementById('login-password').value = password;

      // Forge redrawing the `login-dropdown-list` element because of
      // a bizarre Chrome bug in which part of the DIV is not redrawn
      // in case you had tried to unsuccessfully log in before
      // switching to the signup form.
      //
      // Found tip on how to force a redraw on
      // http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes/3485654#3485654
      var redraw = document.getElementById('login-dropdown-list');
      redraw.style.display = 'none';
      redraw.offsetHeight; // it seems that this line does nothing but is necessary for the redraw to work
      redraw.style.display = 'block';
    },
    'click #forgot-password-link': function () {
      resetMessages();

      // store values of fields before swtiching to the signup form
      var email = elementValueById('login-email');
      var usernameOrEmail = elementValueById('login-username-or-email');

      Session.set(IN_SIGNUP_FLOW_KEY, false);
      Session.set(IN_FORGOT_PASSWORD_FLOW_KEY, true);
      // force the ui to update so that we have the approprate fields to fill in
      Meteor.flush();

      // update new fields with appropriate defaults
      if (email !== null)
        document.getElementById('forgot-password-email').value = email;
      else if (usernameOrEmail !== null)
        if (usernameOrEmail.indexOf('@') !== -1)
          document.getElementById('forgot-password-email').value = usernameOrEmail;

    },
    'keypress #login-username, keypress #login-email, keypress #login-username-or-email, keypress #login-password, keypress #login-password-again': function (event) {
      if (event.keyCode === 13)
        loginOrSignup();
    }
  };

  Template.loginButtonsServicesRow.fields = function () {
    var loginFields = [
      {fieldName: 'username-or-email', fieldLabel: 'Username or Email',
       visible: function () {
         return Accounts._options.requireUsername
           && Accounts._options.requireEmail;
       }},
      {fieldName: 'username', fieldLabel: 'Username',
       visible: function () {
         return Accounts._options.requireUsername
           && !Accounts._options.requireEmail;
       }},
      {fieldName: 'email', fieldLabel: 'Email',
       visible: function () {
         return !Accounts._options.requireUsername;
       }},
      {fieldName: 'password', fieldLabel: 'Password', inputType: 'password',
       visible: function () {
         return true;
       }}
    ];

    var signupFields = [
      {fieldName: 'username', fieldLabel: 'Username',
       visible: function () {
         return Accounts._options.requireUsername;
       }},
      {fieldName: 'email', fieldLabel: 'Email',
       visible: function () {
         return !Accounts._options.requireUsername
           || Accounts._options.requireEmail;
       }},
      {fieldName: 'password', fieldLabel: 'Password', inputType: 'password',
       visible: function () {
         return true;
       }},
      {fieldName: 'password-again', fieldLabel: 'Password (again)',
       inputType: 'password',
       visible: function () {
         return Accounts._options.requireUsername
           && !Accounts._options.requireEmail;
       }}
    ];

    var fields = Session.get(IN_SIGNUP_FLOW_KEY) ? signupFields : loginFields;
    return _.filter(fields, function(info) {
      return info.visible();
    });
  };

  Template.loginButtonsServicesRow.services = function () {
    return getLoginServices();
  };

  Template.loginButtonsServicesRow.isPasswordService = function () {
    return this.name === 'password';
  };

  Template.loginButtonsServicesRow.hasOtherServices = function () {
    return getLoginServices().length > 1;
  };

  Template.loginButtonsServicesRow.inForgotPasswordFlow = function () {
    return Session.get(IN_FORGOT_PASSWORD_FLOW_KEY);
  };

  Template.loginButtonsServicesRow.inLoginFlow = function () {
    return !Session.get(IN_SIGNUP_FLOW_KEY) && !Session.get(IN_FORGOT_PASSWORD_FLOW_KEY);
  };

  Template.loginButtonsServicesRow.inSignupFlow = function () {
    return Session.get(IN_SIGNUP_FLOW_KEY);
  };

  Template.loginButtonsServicesRow.showForgotPasswordLink = function () {
    return Accounts._options.requireEmail
      || !Accounts._options.requireUsername;
  };

  Template.loginButtonsServicesRow.configured = function () {
    return !!Accounts.configuration.findOne({service: this.name.toLowerCase()});
  };

  Template.loginButtonsServicesRow.capitalizedName = function () {
    return capitalize(this.name);
  };


  //
  // loginButtonsMessage template
  //

  Template.loginButtonsMessages.errorMessage = function () {
    return Session.get(ERROR_MESSAGE_KEY);
  };

  Template.loginButtonsMessages.infoMessage = function () {
    return Session.get(INFO_MESSAGE_KEY);
  };


  //
  // forgotPasswordForm template
  //
  Template.forgotPasswordForm.events = {
    'keypress #forgot-password-email': function (event) {
      if (event.keyCode === 13)
        forgotPassword();
    },
    'click #login-buttons-forgot-password': function () {
      forgotPassword();
    }
  };

  var forgotPassword = function () {
    resetMessages();

    var email = document.getElementById("forgot-password-email").value;
    if (email.indexOf('@') !== -1) {
      Accounts.forgotPassword({email: email}, function (error) {
        if (error)
          Session.set(ERROR_MESSAGE_KEY, error.reason || "Unknown error");
        else
          Session.set(INFO_MESSAGE_KEY, "Email sent");
      });
    } else {
      Session.set(ERROR_MESSAGE_KEY, "Invalid email");
    }
  };


  //
  // loginButtonsServicesDropdown template
  //

  Template.loginButtonsServicesDropdown.events = {
    'click #login-sign-in-link': function () {
      Session.set(DROPDOWN_VISIBLE_KEY, true);
      Meteor.flush();
      correctDropdownZIndexes();
    },
    'click .login-close-text': function () {
      resetSession();
   }
  };

  Template.loginButtonsServicesDropdown.dropdownVisible = function () {
    return Session.get(DROPDOWN_VISIBLE_KEY);
  };


  //
  // resetPasswordForm template
  //

  Template.resetPasswordForm.events = {
    'click #login-buttons-reset-password-button': function () {
      resetPassword();
    },
    'keypress #reset-password-new-password': function (event) {
      if (event.keyCode === 13)
        resetPassword();
    },
    'click #login-buttons-cancel-reset-password': function () {
      Session.set(RESET_PASSWORD_TOKEN_KEY, null);
      Accounts._enableAutoLogin();
    }
  };

  var resetPassword = function () {
    resetMessages();
    var newPassword = document.getElementById('reset-password-new-password').value;
    if (!validatePassword(newPassword))
      return;

    Accounts.resetPassword(
      Session.get(RESET_PASSWORD_TOKEN_KEY), newPassword,
      function (error) {
        if (error) {
          Session.set(ERROR_MESSAGE_KEY, error.reason || "Unknown error");
        } else {
          Session.set(RESET_PASSWORD_TOKEN_KEY, null);
          Accounts._enableAutoLogin();
        }
      });
  };

  Template.resetPasswordForm.inResetPasswordFlow = function () {
    return Session.get(RESET_PASSWORD_TOKEN_KEY);
  };

  if (Accounts._resetPasswordToken) {
    Session.set(RESET_PASSWORD_TOKEN_KEY, Accounts._resetPasswordToken);
  }


  //
  // enrollAccountForm template
  //

  Template.enrollAccountForm.events = {
    'click #login-buttons-enroll-account-button': function () {
      enrollAccount();
    },
    'keypress #enroll-account-password': function (event) {
      if (event.keyCode === 13)
        enrollAccount();
    },
    'click #login-buttons-cancel-enroll-account': function () {
      Session.set(ENROLL_ACCOUNT_TOKEN_KEY, null);
      Accounts._enableAutoLogin();
    }
  };

  var enrollAccount = function () {
    resetMessages();
    var password = document.getElementById('enroll-account-password').value;
    if (!validatePassword(password))
      return;

    Accounts.resetPassword(
      Session.get(ENROLL_ACCOUNT_TOKEN_KEY), password,
      function (error) {
        if (error) {
          Session.set(ERROR_MESSAGE_KEY, error.reason || "Unknown error");
        } else {
          Session.set(ENROLL_ACCOUNT_TOKEN_KEY, null);
          Accounts._enableAutoLogin();
        }
      });
  };

  Template.enrollAccountForm.inEnrollAccountFlow = function () {
    return Session.get(ENROLL_ACCOUNT_TOKEN_KEY);
  };

  if (Accounts._enrollAccountToken) {
    Session.set(ENROLL_ACCOUNT_TOKEN_KEY, Accounts._enrollAccountToken);
  }


  //
  // justValidatedUserForm template
  //

  Template.justValidatedUserForm.events = {
    'click #just-validated-dismiss-button': function () {
      Session.set(JUST_VALIDATED_USER_KEY, false);
    }
  };

  Template.justValidatedUserForm.visible = function () {
    return Session.get(JUST_VALIDATED_USER_KEY);
  };


  // Needs to be in Meteor.startup because of a package loading order
  // issue. We can't be sure that accounts-password is loaded earlier
  // than accounts-ui so Accounts.validateEmail might not be defined.
  Meteor.startup(function () {
    if (Accounts._validateEmailToken) {
      Accounts.validateEmail(Accounts._validateEmailToken, function(error) {
        Accounts._enableAutoLogin();
        if (!error)
          Session.set(JUST_VALIDATED_USER_KEY, true);
        // XXX show something if there was an error.
      });
    }
  });

  //
  // loginButtonsChangePassword template
  //

  Template.loginButtonsChangePassword.events({
    'keypress #login-old-password, keypress #login-password, keypress #login-password-again': function (event) {
      if (event.keyCode === 13)
        changePassword();
    },
    'click #login-buttons-do-change-password': function () {
      changePassword();
    }
  });

  Template.loginButtonsChangePassword.fields = function () {
    return [
      {fieldName: 'old-password', fieldLabel: 'Current Password', inputType: 'password',
       visible: function () {
         return true;
       }},
      {fieldName: 'password', fieldLabel: 'New Password', inputType: 'password',
       visible: function () {
         return true;
       }},
      {fieldName: 'password-again', fieldLabel: 'New Password (again)',
       inputType: 'password',
       visible: function () {
         return Meteor.accounts._options.requireUsername
           && !Meteor.accounts._options.requireEmail;
       }}
    ];
  };


  //
  // configureLoginServicesDialog template
  //

  Template.configureLoginServicesDialog.events({
    'click #configure-login-services-dismiss-button': function () {
      Session.set(CONFIGURE_LOGIN_SERVICES_DIALOG_VISIBLE, false);
    },
    'click #configure-login-services-dialog-save-configuration': function () {
      if (Session.get(CONFIGURE_LOGIN_SERVICES_DIALOG_SAVE_ENABLED)) {
        // Prepare the configuration document for this login service
        var serviceName = Session.get(CONFIGURE_LOGIN_SERVICES_DIALOG_SERVICE_NAME);
        var configuration = {
          service: serviceName
        };
        _.each(configurationFields(), function(field) {
          configuration[field.property] = document.getElementById(
            'configure-login-services-dialog-' + field.property).value;
        });

        // Configure this login service
        Meteor.call("configureLoginService", configuration, function (error, result) {
          if (error)
            Meteor._debug("Error configurating login service " + serviceName, error);
          else
            Session.set(CONFIGURE_LOGIN_SERVICES_DIALOG_VISIBLE, false);
        });
      }
    }
  });

  Template.configureLoginServicesDialog.events({
    'input': function (event) {
      // if the event fired on one of the configuration input fields,
      // check whether we should enable the 'save configuration' button
      if (event.target.id.indexOf('configure-login-services-dialog') === 0)
        updateSaveDisabled();
    }
  });

  // check whether the 'save configuration' button should be enabled.
  // this is a really strange way to implement this and a Forms
  // Abstraction would make all of this reactive, and simpler.
  var updateSaveDisabled = function () {
    var saveEnabled = true;
    _.any(configurationFields(), function(field) {
      if (document.getElementById(
        'configure-login-services-dialog-' + field.property).value === '') {
        saveEnabled = false;
        return true;
      } else {
        return false;
      }
    });

    Session.set(CONFIGURE_LOGIN_SERVICES_DIALOG_SAVE_ENABLED, saveEnabled);
  };

  // Returns the appropriate template for this login service.  This
  // template should be defined in the service's package
  var configureLoginServicesDialogTemplateForService = function () {
    var serviceName = Session.get(CONFIGURE_LOGIN_SERVICES_DIALOG_SERVICE_NAME);
    return Template['configureLoginServicesDialogFor' + capitalize(serviceName)];
  };

  var configurationFields = function () {
    var template = configureLoginServicesDialogTemplateForService();
    return template.fields();
  };

  Template.configureLoginServicesDialog.configurationFields = function () {
    return configurationFields();
  };

  Template.configureLoginServicesDialog.visible = function () {
    return Session.get(CONFIGURE_LOGIN_SERVICES_DIALOG_VISIBLE);
  };

  Template.configureLoginServicesDialog.configurationSteps = function () {
    // renders the appropriate template
    return configureLoginServicesDialogTemplateForService()();
  };

  Template.configureLoginServicesDialog.saveDisabled = function () {
    return !Session.get(CONFIGURE_LOGIN_SERVICES_DIALOG_SAVE_ENABLED);
  };

  //
  // helpers
  //

  var displayName = function () {
    var user = Meteor.user();
    if (!user)
      return '';

    if (user.profile && user.profile.name)
      return user.profile.name;
    if (user.username)
      return user.username;
    if (user.emails && user.emails[0] && user.emails[0].address)
      return user.emails[0].address;

    return '';
  };

  var elementValueById = function(id) {
    var element = document.getElementById(id);
    if (!element)
      return null;
    else
      return element.value;
  };

  var login = function () {
    resetMessages();

    var username = elementValueById('login-username');
    var email = elementValueById('login-email');
    var usernameOrEmail = elementValueById('login-username-or-email');
    var password = elementValueById('login-password');

    var loginSelector;
    if (username !== null)
      loginSelector = {username: username};
    else if (email !== null)
      loginSelector = {email: email};
    else if (usernameOrEmail !== null)
      loginSelector = usernameOrEmail;
    else
      throw new Error("Unexpected -- no element to use as a login user selector");

    Meteor.loginWithPassword(loginSelector, password, function (error, result) {
      if (error) {
        Session.set(ERROR_MESSAGE_KEY, error.reason || "Unknown error");
      } else {
        resetSession();
      }
    });
  };

  var signup = function () {
    resetMessages();

    var options = {}; // to be passed to Meteor.createUser

    var username = elementValueById('login-username');
    if (username !== null) {
      if (!validateUsername(username))
        return;
      else
        options.username = username;
    }

    var email = elementValueById('login-email');
    if (email !== null) {
      if (!validateEmail(email))
        return;
      else
        options.email = email;
    }

    var password = elementValueById('login-password');
    if (!validatePassword(password))
      return;
    else
      options.password = password;

    if (!matchPasswordAgainIfPresent())
      return;

    if (Accounts._options.validateEmails)
      options.validation = true;

    Accounts.createUser(options, function (error) {
      if (error) {
        Session.set(ERROR_MESSAGE_KEY, error.reason || "Unknown error");
      } else {
        resetSession();
      }
    });
  };

  var loginOrSignup = function () {
    if (Session.get(IN_SIGNUP_FLOW_KEY))
      signup();
    else
      login();
  };

  var changePassword = function () {
    resetMessages();

    var oldPassword = elementValueById('login-old-password');

    var password = elementValueById('login-password');
    if (!validatePassword(password))
      return;

    if (!matchPasswordAgainIfPresent())
      return;

    Accounts.changePassword(oldPassword, password, function (error) {
      if (error) {
        Session.set(ERROR_MESSAGE_KEY, error.reason || "Unknown error");
      } else {
        Session.set(INFO_MESSAGE_KEY, "Password changed");
      }
    });
  };

  var matchPasswordAgainIfPresent = function () {
    var passwordAgain = elementValueById('login-password-again');
    if (passwordAgain !== null) {
      var password = elementValueById('login-password');
      if (password !== passwordAgain) {
        Session.set(ERROR_MESSAGE_KEY, "Passwords don't match");
        return false;
      }
    }
    return true;
  };

  var correctDropdownZIndexes = function () {
    // IE <= 7 has a z-index bug that means we can't just give the
    // dropdown a z-index and expect it to stack above the rest of
    // the page even if nothing else has a z-index.  The nature of
    // the bug is that all positioned elements are considered to
    // have z-index:0 (not auto) and therefore start new stacking
    // contexts, with ties broken by page order.
    //
    // The fix, then is to give z-index:1 to all ancestors
    // of the dropdown having z-index:0.
    for(var n = document.getElementById('login-dropdown-list').parentNode;
        n.nodeName !== 'BODY';
        n = n.parentNode)
      if (n.style.zIndex === 0)
        n.style.zIndex = 1;
  };

  var getLoginServices = function () {
    var ret = [];
    // make sure to put password last, since this is how it is styled
    // in the ui as well.
    _.each(
      ['facebook', 'google', 'weibo', 'twitter', 'github', 'password'],
      function (service) {
        if (Accounts[service])
          ret.push({name: service});
      });

    return ret;
  };


  // XXX improve these? should this be in accounts-password instead?
  //
  // XXX these will become configurable, and will be validated on
  // the server as well.
  var validateUsername = function (username) {
    if (username.length >= 3) {
      return true;
    } else {
      Session.set(ERROR_MESSAGE_KEY, "Username must be at least 3 characters long");
      return false;
    }
  };
  var validateEmail = function (email) {
    if (email.indexOf('@') !== -1) {
      return true;
    } else {
      Session.set(ERROR_MESSAGE_KEY, "Invalid email");
      return false;
    }
  };
  var validatePassword = function (password) {
    if (password.length >= 6) {
      return true;
    } else {
      Session.set(ERROR_MESSAGE_KEY, "Password must be at least 6 characters long");
      return false;
    }
  };

  // XXX from http://epeli.github.com/underscore.string/lib/underscore.string.js
  var capitalize = function(str){
    str = str == null ? '' : String(str);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
})();

