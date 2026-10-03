const { Op } = require("sequelize");
const { DEMO_EMAILS, assertDemoMode } = require("./demoSupport");
const {
  sequelize,
  User,
  Doctor,
  Appointment,
  Queue,
  PatientProfile,
  DoctorAvailability,
  ConsultationRecord,
  AuditLog,
  Notification,
} = require("../models");

const removeDemoData = async (transaction) => {
  const users = await User.findAll({
    attributes: ["id"],
    where: { email: { [Op.in]: Object.values(DEMO_EMAILS) } },
    transaction,
  });
  const userIds = users.map((user) => user.id);
  if (!userIds.length) return;

  const doctors = await Doctor.findAll({
    attributes: ["id"],
    where: { user_id: { [Op.in]: userIds } },
    transaction,
  });
  const doctorIds = doctors.map((doctor) => doctor.id);
  const appointments = await Appointment.findAll({
    attributes: ["id"],
    where: {
      [Op.or]: [
        { patient_id: { [Op.in]: userIds } },
        ...(doctorIds.length ? [{ doctor_id: { [Op.in]: doctorIds } }] : []),
      ],
    },
    transaction,
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  if (appointmentIds.length) {
    await ConsultationRecord.destroy({ where: { appointment_id: { [Op.in]: appointmentIds } }, transaction });
    await Queue.destroy({ where: { appointment_id: { [Op.in]: appointmentIds } }, transaction });
    await Appointment.destroy({ where: { id: { [Op.in]: appointmentIds } }, transaction });
  }
  if (doctorIds.length) {
    await DoctorAvailability.destroy({ where: { doctor_id: { [Op.in]: doctorIds } }, transaction });
    await Doctor.destroy({ where: { id: { [Op.in]: doctorIds } }, transaction });
  }
  await PatientProfile.destroy({ where: { user_id: { [Op.in]: userIds } }, transaction });
  await Notification.destroy({ where: { recipient_user_id: { [Op.in]: userIds } }, transaction });
  await AuditLog.destroy({ where: { actor_user_id: { [Op.in]: userIds } }, transaction });
  await User.destroy({ where: { id: { [Op.in]: userIds } }, transaction });
};

const main = async () => {
  assertDemoMode();
  await sequelize.authenticate();
  await sequelize.transaction(removeDemoData);
  console.log("Evaluation demo accounts and workflow data were removed.");
};

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = { removeDemoData };
