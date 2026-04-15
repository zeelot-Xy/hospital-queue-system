const emitQueueEvent = (app, eventName, payload, options = {}) => {
  const io = app.get("io");

  if (!io) {
    return;
  }

  const { rooms = [] } = options;

  if (rooms.length === 0) {
    io.emit(eventName, payload);
    return;
  }

  rooms.forEach((room) => {
    io.to(room).emit(eventName, payload);
  });
};

const emitQueueRefresh = (app, queue, eventName, extraPayload = {}) => {
  const doctorRoom = `doctor:${queue.doctor_id}`;
  const patientRoom = `patient:${queue.patient_id}`;
  const staffRooms = ["role:staff", "role:admin"];

  emitQueueEvent(
    app,
    eventName,
    {
      queueId: queue.id,
      appointmentId: queue.appointment_id,
      doctorId: queue.doctor_id,
      patientId: queue.patient_id,
      status: queue.status,
      ...extraPayload,
    },
    { rooms: [doctorRoom, patientRoom, ...staffRooms] },
  );

  emitQueueEvent(
    app,
    "queue:refresh",
    {
      queueId: queue.id,
      doctorId: queue.doctor_id,
      patientId: queue.patient_id,
      status: queue.status,
    },
    { rooms: [doctorRoom, patientRoom, ...staffRooms] },
  );
};

module.exports = {
  emitQueueEvent,
  emitQueueRefresh,
};
