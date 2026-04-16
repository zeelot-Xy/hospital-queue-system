const { AuditLog } = require("../models");

const logAudit = async ({
  actorUserId = null,
  actionType,
  targetType,
  targetId = null,
  metadata = null,
}) => {
  if (!actionType || !targetType) {
    return null;
  }

  return AuditLog.create({
    actor_user_id: actorUserId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    metadata,
  });
};

module.exports = {
  logAudit,
};
