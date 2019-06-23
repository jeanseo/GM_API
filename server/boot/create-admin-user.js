module.exports = function(app) {

  let User = app.models.agent;
  let Role = app.models.Role;
  let RoleMapping = app.models.RoleMapping;

  User.findOrCreate({ where: { username: 'admin', email: 'admin@admin.com' } },
    {
      username: 'admin',
      email: 'admin@admin.com',
      password: 'admin123'
    },
    function(err, user) {
      if (err) return console.log(err);
      // Create the admin role
      Role.findOrCreate({where: { name: 'ADMINISTRATOR' }},
        { name: 'ADMINISTRATOR' },
        function(err, role) {
          if (err) return debug(err);
          console.log("Role Created: " + role.name);
          // Assign admin role
          RoleMapping.findOrCreate({where: { roleId: role.id, principalId: user.id }},
            { roleId: role.id, principalId: user.id, principalType: RoleMapping.USER },
            function(err, roleMapping) {
              if (err) return console.log(err);
              console.log("ADMINISTRATOR Role assigned to " + user.username);
            });
        });
    });
};
