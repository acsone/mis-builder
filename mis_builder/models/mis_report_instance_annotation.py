# Copyright 2025 ACSONE SA/NV
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class MisReportInstanceAnnotation(models.Model):
    _name = "mis.report.instance.annotation"
    _description = "Mis Report Instance Annotation"

    period_id = fields.Many2one(
        comodel_name="mis.report.instance.period",
    )
    kpi_id = fields.Many2one(
        comodel_name="mis.report.kpi",
    )
    subkpi_id = fields.Many2one(
        comodel_name="mis.report.subkpi",
    )
    company_id = fields.Many2one(
        comodel_name="res.company",
        required=True,
    )
    note = fields.Char()

    _sql_constraints = [
        (
            "annotation_unique",
            "unique(period_id, kpi_id,subkpi_id,company_id)",
            "Only one annotation per cell(defined using period,kpi,sub kpi,company_id)",
        ),
    ]

    @api.model
    def set_annotation(self, period_id, kpi_id, subkpi_id, note):
        annotation = self.env["mis.report.instance.annotation"].search(
            [
                ("period_id", "=", period_id),
                ("kpi_id", "=", kpi_id),
                ("subkpi_id", "=", subkpi_id),
                ("company_id", "=", self.env.company.id),
            ],
            limit=1,
        )

        if annotation:
            annotation.note = note
        else:
            self.env["mis.report.instance.annotation"].create(
                {
                    "period_id": period_id,
                    "kpi_id": kpi_id,
                    "subkpi_id": subkpi_id,
                    "note": note,
                    "company_id": self.env.company.id,
                }
            )

    @api.model
    def remove_annotation(self, period_id, kpi_id, subkpi_id):
        annotation = self.env["mis.report.instance.annotation"].search(
            [
                ("period_id", "=", period_id),
                ("kpi_id", "=", kpi_id),
                ("subkpi_id", "=", subkpi_id),
                ("company_id", "=", self.env.company.id),
            ],
            limit=1,
        )
        if annotation:
            annotation.unlink()
