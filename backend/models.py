from sqlalchemy import Column, Integer, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from db import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    role = Column(Text, nullable=False)  # 'employee' | 'admin' | 'technician'
    department = Column(Text)


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    category = Column(Text, nullable=False)
    priority = Column(Text, nullable=False, default="Medium")
    status = Column(Text, nullable=False, default="Pending")
    sla_minutes = Column(Integer, nullable=False)
    assigned_to = Column(Integer, ForeignKey("employees.id"))
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    employee = relationship("Employee", foreign_keys=[employee_id])
    assignee = relationship("Employee", foreign_keys=[assigned_to])
    equipment = relationship("Equipment", foreign_keys=[equipment_id])


class EscalationLog(Base):
    __tablename__ = "escalation_logs"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    from_status = Column(Text, nullable=False)
    to_status = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    escalated_to = Column(Text)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True)
    category = Column(Text, nullable=False)
    label = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="Active")  # Active | Damaged | In Repair | Spare
    department = Column(Text)


class SwapLog(Base):
    __tablename__ = "swap_logs"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    damaged_equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    spare_equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
