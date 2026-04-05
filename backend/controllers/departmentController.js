const { Department } = require("../models/index");

const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({ order: [["name", "ASC"]] });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    const department = await Department.create({
      name,
      description,
      status: "active",
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const department = await Department.findByPk(id);
    if (!department)
      return res.status(404).json({ message: "Department not found" });

    await department.update({ name, description, status });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await Department.destroy({ where: { id } });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
