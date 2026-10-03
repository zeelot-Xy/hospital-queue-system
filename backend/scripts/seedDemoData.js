const bcrypt = require("bcryptjs");
const { DEMO_EMAILS, assertDemoMode, assertDemoPassword } = require("./demoSupport");
const { removeDemoData } = require("./resetDemoData");
const {
  sequelize,
  User,
  Department,
  Doctor,
  Appointment,
  Queue,
  PatientProfile,
  DoctorAvailability,
  ConsultationRecord,
} = require("../models");

const isoDate = (date) => date.toISOString().slice(0, 10);

const main = async () => {
  assertDemoMode();
  const password = assertDemoPassword();
  await sequelize.authenticate();

  await sequelize.transaction(async (transaction) => {
    await removeDemoData(transaction);
    const department = await Department.findOne({
      where: { name: "General Medicine" },
      transaction,
    });
    if (!department) throw new Error("Starter departments have not been seeded");

    const passwordHash = await bcrypt.hash(password, 12);
    const staff = await User.create({
      full_name: "Demo Reception Officer",
      email: DEMO_EMAILS.staff,
      phone: "+2348000000101",
      password: passwordHash,
      role: "staff",
      status: "active",
    }, { transaction });
    const doctorUser = await User.create({
      full_name: "Demo Doctor",
      email: DEMO_EMAILS.doctor,
      phone: "+2348000000102",
      password: passwordHash,
      role: "doctor",
      status: "active",
    }, { transaction });
    const patient = await User.create({
      full_name: "Demo Patient",
      email: DEMO_EMAILS.patient,
      phone: "+2348000000103",
      password: passwordHash,
      role: "patient",
      status: "active",
    }, { transaction });
    const doctor = await Doctor.create({
      user_id: doctorUser.id,
      department_id: department.id,
      specialization: "Primary Care",
      status: "active",
    }, { transaction });
    await PatientProfile.create({
      user_id: patient.id,
      blood_group: "O+",
      date_of_birth: "1995-05-15",
      allergies: "No known allergies (demonstration data)",
      chronic_conditions: "None recorded (demonstration data)",
    }, { transaction });

    for (let day = 0; day < 7; day += 1) {
      await DoctorAvailability.create({
        doctor_id: doctor.id,
        day_of_week: day,
        start_time: "08:00:00",
        end_time: "17:00:00",
        slot_minutes: 30,
        is_active: true,
      }, { transaction });
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const completed = await Appointment.create({
      patient_id: patient.id,
      doctor_id: doctor.id,
      department_id: department.id,
      appointment_date: isoDate(yesterday),
      appointment_time: "10:00:00",
      status: "completed",
    }, { transaction });
    await ConsultationRecord.create({
      appointment_id: completed.id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      presenting_complaint: "Demonstration follow-up visit",
      findings: "Sample observations for client evaluation",
      diagnosis: "Demonstration record - not a medical diagnosis",
      treatment_plan: "No treatment; evaluation data only",
      follow_up_advice: "Explore the Visit History screen",
      note_summary: "Completed demonstration consultation",
    }, { transaction });

    const active = await Appointment.create({
      patient_id: patient.id,
      doctor_id: doctor.id,
      department_id: department.id,
      appointment_date: isoDate(today),
      appointment_time: "09:00:00",
      status: "arrived",
      arrived_at: new Date(),
    }, { transaction });
    await Queue.create({
      appointment_id: active.id,
      patient_id: patient.id,
      doctor_id: doctor.id,
      department_id: department.id,
      queue_number: 1,
      queue_date: isoDate(today),
      status: "waiting",
      joined_at: new Date(Date.now() - 10 * 60 * 1000),
    }, { transaction });

    void staff;
  });

  console.log(JSON.stringify({
    message: "Evaluation demo data is ready",
    accounts: DEMO_EMAILS,
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
